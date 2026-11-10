import "dotenv/config";
import { createHash } from "node:crypto";
import pg from "pg";
import {
  chunkKnowledgeText,
  duplicateKnowledgeDocumentKeys,
  hashKnowledgeContent,
} from "../lib/rag/core.ts";
import { requestEmbeddings } from "../lib/rag/embedding-client.ts";
import {
  curatedKnowledgeDocuments,
  ragSources,
} from "../lib/rag/curated-corpus.ts";

const apply = process.argv.includes("--apply");
const startedAt = performance.now();
const summary = {
  mode: apply ? "apply" : "dry-run",
  sourcesRegistered: ragSources.length,
  sourceDocuments: curatedKnowledgeDocuments.length,
  newDocuments: 0,
  updatedDocuments: 0,
  unchangedDocuments: 0,
  deletedDocuments: 0,
  chunksWritten: 0,
  chunksEmbedded: 0,
  embeddingTokens: 0,
  embeddingLatencyMs: 0,
  embeddingCostUsd: null,
  embeddingProvider: process.env.OPENROUTER_API_KEY ? "openrouter" : "disabled",
  quarantined: [],
  errors: [],
};

const apiKey = process.env.OPENROUTER_API_KEY;
const duplicateKeys = duplicateKnowledgeDocumentKeys(curatedKnowledgeDocuments);
summary.duplicateDocumentKeys = duplicateKeys.size;
const model =
  process.env.RAG_EMBEDDING_MODEL || "openai/text-embedding-3-small";
const dimensions = Number(process.env.RAG_EMBEDDING_DIMENSIONS || 1536);
const costPerMillionRaw = process.env.OPENROUTER_EMBEDDING_COST_PER_MILLION_USD;
const costPerMillion = costPerMillionRaw?.trim()
  ? Number(costPerMillionRaw)
  : undefined;

function sourceMayBeIndexed(source) {
  const policy = source.storagePolicy.toLowerCase();
  const statusAllowsStorage = source.licenseStatus === "attribution_required";
  const narrowlyPermittedFactPolicy =
    /^(factual names only|name and stable identifier only)/.test(policy);
  return (
    source.currentUse === "used" &&
    statusAllowsStorage &&
    narrowlyPermittedFactPolicy
  );
}

function stableDocumentHash(document) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: document.title,
        content: document.content,
        destinationId: document.destinationId ?? null,
        categoryIds: [...document.categoryIds].sort(),
        factTypes: [...document.factTypes].sort(),
        language: document.language,
        verificationStatus: document.verificationStatus,
        sourceUrl: document.sourceUrl,
        attribution: document.attribution,
        license: document.license,
        storagePolicy: document.storagePolicy,
        lastVerifiedAt: document.lastVerifiedAt ?? null,
        latitude: document.latitude ?? null,
        longitude: document.longitude ?? null,
      }),
    )
    .digest("hex");
}

function failureDetails(error) {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
}

async function main() {
  if (!apply) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          documents: curatedKnowledgeDocuments.map((document) => ({
            sourceId: document.sourceId,
            sourceDocumentId: document.sourceDocumentId,
            title: document.title,
            contentHash: hashKnowledgeContent(document.content),
            chunks: chunkKnowledgeText(document.content).length,
          })),
          message:
            "Dry run only. Use --apply after the RAG migration is deployed.",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required for --apply");
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 8_000,
  });
  try {
    const extension = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS enabled",
    );
    if (!extension.rows[0]?.enabled)
      throw new Error(
        "pgvector is not enabled; apply the reviewed RAG migration first",
      );

    const now = new Date();
    for (const source of ragSources) {
      await pool.query(
        `INSERT INTO knowledge_sources
         (id,name,url,owner,\"licenseStatus\",license,\"termsUrl\",attribution,\"storagePolicy\",\"dataTypes\",\"lastCheckedAt\",\"ingestionAllowed\",\"updatedAt\")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name,url=EXCLUDED.url,owner=EXCLUDED.owner,
           \"licenseStatus\"=EXCLUDED.\"licenseStatus\",license=EXCLUDED.license,
           \"termsUrl\"=EXCLUDED.\"termsUrl\",attribution=EXCLUDED.attribution,
           \"storagePolicy\"=EXCLUDED.\"storagePolicy\",\"dataTypes\"=EXCLUDED.\"dataTypes\",
           \"lastCheckedAt\"=EXCLUDED.\"lastCheckedAt\",\"ingestionAllowed\"=EXCLUDED.\"ingestionAllowed\",
           \"updatedAt\"=EXCLUDED.\"updatedAt\"`,
        [
          source.id,
          source.name,
          source.url,
          source.owner,
          source.licenseStatus,
          source.license,
          source.termsUrl,
          source.attribution,
          source.storagePolicy,
          source.dataTypes,
          source.lastCheckedAt,
          sourceMayBeIndexed(source),
          now,
        ],
      );
    }

    const failedSourceIds = new Set();
    for (const document of curatedKnowledgeDocuments) {
      const documentKey = `${document.sourceId}\u0000${document.sourceDocumentId}`;
      if (duplicateKeys.has(documentKey)) {
        const errorCode = "DUPLICATE_SOURCE_DOCUMENT_ID";
        await quarantine(
          pool,
          document,
          "validation",
          errorCode,
          "Multiple curated records use the same source and source-document identifier",
        );
        summary.quarantined.push({
          sourceId: document.sourceId,
          sourceDocumentId: document.sourceDocumentId,
          errorCode,
        });
        failedSourceIds.add(document.sourceId);
        continue;
      }
      const source = ragSources.find((item) => item.id === document.sourceId);
      if (!source || !sourceMayBeIndexed(source)) {
        const errorCode = "SOURCE_STORAGE_POLICY_BLOCKED";
        await quarantine(
          pool,
          document,
          "validation",
          errorCode,
          "Source policy disallows persistence",
        );
        summary.quarantined.push({
          sourceId: document.sourceId,
          sourceDocumentId: document.sourceDocumentId,
          errorCode,
        });
        failedSourceIds.add(document.sourceId);
        continue;
      }
      try {
        const embeddingFailed = await ingestDocument(pool, document);
        if (embeddingFailed) failedSourceIds.add(document.sourceId);
      } catch (error) {
        const errorCode = error?.code ?? "INGESTION_FAILED";
        await quarantine(
          pool,
          document,
          "ingestion",
          errorCode,
          failureDetails(error),
        );
        summary.quarantined.push({
          sourceId: document.sourceId,
          sourceDocumentId: document.sourceDocumentId,
          errorCode,
        });
        failedSourceIds.add(document.sourceId);
      }
    }

    const managedSources = ragSources.filter(sourceMayBeIndexed);
    for (const source of managedSources) {
      if (failedSourceIds.has(source.id)) continue;
      const currentIds = curatedKnowledgeDocuments
        .filter((document) => document.sourceId === source.id)
        .map((document) => document.sourceDocumentId);
      const deleted = await pool.query(
        `DELETE FROM knowledge_documents
         WHERE \"sourceId\"=$1 AND NOT (\"sourceDocumentId\" = ANY($2::text[]))`,
        [source.id, currentIds],
      );
      summary.deletedDocuments += deleted.rowCount ?? 0;
    }

    const blockedSources = ragSources.filter(
      (source) => !sourceMayBeIndexed(source),
    );
    for (const source of blockedSources) {
      const deleted = await pool.query(
        `DELETE FROM knowledge_documents WHERE \"sourceId\"=$1`,
        [source.id],
      );
      summary.deletedDocuments += deleted.rowCount ?? 0;
    }
  } finally {
    await pool.end();
  }

  summary.elapsedMs = Math.round(performance.now() - startedAt);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function quarantine(pool, document, stage, errorCode, details) {
  await pool.query(
    `INSERT INTO knowledge_ingestion_failures
      (id,\"sourceId\",\"sourceDocId\",\"contentHash\",stage,\"errorCode\",details)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      `ragfail_${createHash("sha256").update(`${document.sourceId}:${document.sourceDocumentId}:${Date.now()}`).digest("hex").slice(0, 32)}`,
      document.sourceId,
      document.sourceDocumentId,
      hashKnowledgeContent(document.content),
      stage,
      String(errorCode).slice(0, 120),
      details.slice(0, 500),
    ],
  );
}

async function ingestDocument(pool, document) {
  const contentHash = hashKnowledgeContent(document.content);
  const documentHash = stableDocumentHash(document);
  const chunks = chunkKnowledgeText(document.content);
  const currentResult = await pool.query(
    `SELECT id,version,\"contentHash\",\"recordHash\" FROM knowledge_documents
     WHERE \"sourceId\"=$1 AND \"sourceDocumentId\"=$2 AND \"isCurrent\"=true`,
    [document.sourceId, document.sourceDocumentId],
  );
  const current = currentResult.rows[0];
  let existingChunkCount = 0;
  let missingVectorCount = 0;
  let vectorModelMismatchCount = 0;
  if (current) {
    const chunkResult = await pool.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE embedding IS NULL)::int AS missing,
         COUNT(*) FILTER (WHERE embedding IS NOT NULL AND "embeddingModel" IS DISTINCT FROM $2)::int AS "modelMismatch"
       FROM knowledge_chunks WHERE \"documentId\"=$1`,
      [current.id, model],
    );
    existingChunkCount = chunkResult.rows[0]?.total ?? 0;
    missingVectorCount = chunkResult.rows[0]?.missing ?? 0;
    vectorModelMismatchCount = chunkResult.rows[0]?.modelMismatch ?? 0;
    if (vectorModelMismatchCount > 0 && !apiKey) {
      await quarantine(
        pool,
        document,
        "embedding",
        "EMBEDDING_REBUILD_REQUIRED",
        "Stored vectors use a different model; configure the embedding provider before changing the active model",
      );
      summary.quarantined.push({
        sourceId: document.sourceId,
        sourceDocumentId: document.sourceDocumentId,
        errorCode: "EMBEDDING_REBUILD_REQUIRED",
      });
      return true;
    }
    if (
      current.recordHash === documentHash &&
      existingChunkCount === chunks.length &&
      (!apiKey || (missingVectorCount === 0 && vectorModelMismatchCount === 0))
    ) {
      summary.unchangedDocuments += 1;
      return;
    }
  }

  let vectorBatch = null;
  if (
    apiKey &&
    chunks.length > 0 &&
    (!current ||
      missingVectorCount > 0 ||
      vectorModelMismatchCount > 0 ||
      current.contentHash !== contentHash ||
      existingChunkCount !== chunks.length)
  ) {
    try {
      vectorBatch = await requestEmbeddings(
        chunks.map((chunk) => chunk.content),
        {
          apiKey,
          model,
          dimensions,
          timeoutMs: 20_000,
          ...(Number.isFinite(costPerMillion) && costPerMillion >= 0
            ? { costPerMillionUsd: costPerMillion }
            : {}),
        },
      );
      summary.embeddingTokens += vectorBatch.promptTokens ?? 0;
      summary.embeddingLatencyMs += vectorBatch.latencyMs;
      summary.chunksEmbedded += vectorBatch.vectors.length;
      if (vectorBatch.estimatedCostUsd !== null)
        summary.embeddingCostUsd =
          (summary.embeddingCostUsd ?? 0) + vectorBatch.estimatedCostUsd;
    } catch (error) {
      await quarantine(
        pool,
        document,
        "embedding",
        error?.code ?? "EMBEDDING_FAILED",
        failureDetails(error),
      );
      summary.quarantined.push({
        sourceId: document.sourceId,
        sourceDocumentId: document.sourceDocumentId,
        errorCode: error?.code ?? "EMBEDDING_FAILED",
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let documentId = current?.id;
    const recordChanged = !current || current.recordHash !== documentHash;
    const chunksChanged = current && existingChunkCount !== chunks.length;
    if (chunksChanged && !recordChanged && current)
      await client.query(
        `DELETE FROM knowledge_chunks WHERE \"documentId\"=$1`,
        [current.id],
      );
    if (recordChanged || chunksChanged) {
      if (current) {
        await client.query(
          `UPDATE knowledge_documents SET \"isCurrent\"=false WHERE id=$1`,
          [current.id],
        );
        summary.updatedDocuments += 1;
      } else {
        summary.newDocuments += 1;
      }
      const inserted = await client.query(
        `INSERT INTO knowledge_documents
           (id,\"sourceDocumentId\",version,\"isCurrent\",\"isActive\",title,content,\"contentHash\",\"recordHash\",
           \"destinationId\",latitude,longitude,\"categoryIds\",\"factTypes\",language,
           \"verificationStatus\",visibility,\"sourceUrl\",attribution,license,\"storagePolicy\",
           \"lastVerifiedAt\",\"ingestedAt\",\"sourceId\")
         VALUES ($1,$2,$3,true,true,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::\"KnowledgeVerificationStatus\",
           'PUBLIC',$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
        [
          `know_${createHash("sha256")
            .update(
              `${document.sourceId}:${document.sourceDocumentId}:${current ? current.version + 1 : 1}`,
            )
            .digest("hex")
            .slice(0, 32)}`,
          document.sourceDocumentId,
          current ? current.version + 1 : 1,
          document.title,
          document.content,
          contentHash,
          documentHash,
          document.destinationId ?? null,
          document.latitude ?? null,
          document.longitude ?? null,
          document.categoryIds,
          document.factTypes,
          document.language,
          document.verificationStatus,
          document.sourceUrl,
          document.attribution,
          document.license,
          document.storagePolicy,
          document.lastVerifiedAt ?? null,
          new Date(),
          document.sourceId,
        ],
      );
      documentId = inserted.rows[0]?.id;
      for (const chunk of chunks) {
        const chunkId = `chunk_${createHash("sha256").update(`${documentId}:${chunk.chunkIndex}`).digest("hex").slice(0, 32)}`;
        const copied =
          current && current.contentHash === contentHash
            ? await client.query(
                `INSERT INTO knowledge_chunks (id,\"documentId\",\"chunkIndex\",content,\"contentHash\",embedding,\"embeddingModel\",\"embeddingTokens\")
               SELECT $1,$2,$3,content,\"contentHash\",embedding,\"embeddingModel\",\"embeddingTokens\"
               FROM knowledge_chunks WHERE \"documentId\"=$4 AND \"chunkIndex\"=$3 AND \"contentHash\"=$5`,
                [
                  chunkId,
                  documentId,
                  chunk.chunkIndex,
                  current.id,
                  chunk.contentHash,
                ],
              )
            : { rowCount: 0 };
        if (!copied.rowCount)
          await client.query(
            `INSERT INTO knowledge_chunks (id,\"documentId\",\"chunkIndex\",content,\"contentHash\") VALUES ($1,$2,$3,$4,$5)`,
            [
              chunkId,
              documentId,
              chunk.chunkIndex,
              chunk.content,
              chunk.contentHash,
            ],
          );
      }
      summary.chunksWritten += chunks.length;
    } else if (existingChunkCount !== chunks.length) {
      documentId = current.id;
      await client.query(
        `DELETE FROM knowledge_chunks WHERE \"documentId\"=$1`,
        [documentId],
      );
      for (const chunk of chunks) {
        const chunkId = `chunk_${createHash("sha256").update(`${documentId}:${chunk.chunkIndex}`).digest("hex").slice(0, 32)}`;
        await client.query(
          `INSERT INTO knowledge_chunks (id,\"documentId\",\"chunkIndex\",content,\"contentHash\") VALUES ($1,$2,$3,$4,$5)`,
          [
            chunkId,
            documentId,
            chunk.chunkIndex,
            chunk.content,
            chunk.contentHash,
          ],
        );
      }
      summary.chunksWritten += chunks.length;
    }
    if (vectorBatch && documentId) {
      for (const [index, vector] of vectorBatch.vectors.entries()) {
        await client.query(
          `UPDATE knowledge_chunks SET embedding=$1::vector,\"embeddingModel\"=$2,\"embeddingTokens\"=$3
           WHERE \"documentId\"=$4 AND \"chunkIndex\"=$5`,
          [
            `[${vector.join(",")}]`,
            vectorBatch.model,
            vectorBatch.promptTokens === null
              ? null
              : Math.max(
                  0,
                  Math.floor(
                    vectorBatch.promptTokens / vectorBatch.vectors.length,
                  ),
                ),
            documentId,
            index,
          ],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return Boolean(apiKey && chunks.length > 0 && !vectorBatch);
}

main().catch((error) => {
  summary.elapsedMs = Math.round(performance.now() - startedAt);
  summary.errors.push({
    code: error?.code ?? "RAG_INGESTION_ERROR",
    message: failureDetails(error),
  });
  process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
});
