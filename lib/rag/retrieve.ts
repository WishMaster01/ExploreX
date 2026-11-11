import "server-only";
import pg from "pg";
import { getServerEnvironment } from "@/lib/env";
import { serverLogger } from "@/lib/observability/server-logger";
import {
  rankBm25,
  reciprocalRankFusion,
  type RankedKnowledgeDocument,
} from "./core";
import { EmbeddingProviderError, requestEmbeddings } from "./embedding-client";
import { knowledgeSearchSchema, type KnowledgeSearchInput } from "./schemas";
import { buildKnowledgeFilters } from "./query";

const { Pool } = pg;
let pool: InstanceType<typeof Pool> | undefined;

function getPool() {
  const environment = getServerEnvironment();
  if (!environment.DATABASE_URL)
    throw new Error("RAG database is not configured");
  pool ??= new Pool({
    connectionString: environment.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 2_000,
    statement_timeout: 4_000,
  });
  return pool;
}

type Row = {
  id: string;
  documentId: string;
  sourceDocumentId: string;
  contentHash: string;
  version: number;
  title: string;
  content: string;
  destinationId: string | null;
  categoryIds: string[];
  factTypes: string[];
  verificationStatus: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  storagePolicy: string;
  lastVerifiedAt: Date | string | null;
  sourceId: string;
  sourceName: string;
  score: number;
};

export type KnowledgeEvidence = RankedKnowledgeDocument & {
  documentId: string;
  chunkId: string;
  sourceDocumentId: string;
  contentHash: string;
  version: number;
  retrievedAt: string;
};

function mapRows(rows: Row[], method: string) {
  return rows.map((row) => ({
    ...row,
    chunkId: row.id,
    lastVerifiedAt:
      row.lastVerifiedAt instanceof Date
        ? row.lastVerifiedAt.toISOString().slice(0, 10)
        : row.lastVerifiedAt,
    retrievalMethods: [method],
  }));
}

async function queryRows(
  input: KnowledgeSearchInput,
  ownerId: string | null,
  mode: "keyword" | "semantic",
  vector?: number[],
) {
  const { values, where } = buildKnowledgeFilters(
    input,
    ownerId,
    mode === "keyword",
  );
  const limitIndex = values.push(Math.min(60, input.limit * 5));
  let scoreExpression: string;
  let orderExpression: string;
  if (mode === "semantic") {
    const vectorIndex = values.push(`[${vector?.join(",") ?? ""}]`);
    scoreExpression = `1 - (c.embedding <=> $${vectorIndex}::vector)`;
    orderExpression = `c.embedding <=> $${vectorIndex}::vector`;
  } else {
    scoreExpression = `ts_rank_cd(c."searchVector", websearch_to_tsquery('simple',$1))`;
    orderExpression = `c."searchVector" @@ websearch_to_tsquery('simple',$1) DESC, ${scoreExpression} DESC`;
  }
  const result = await getPool().query<Row>(
    `SELECT c.id,c."documentId",d."sourceDocumentId",d."contentHash",d.version,d.title,c.content,d."destinationId",d."categoryIds",d."factTypes",
      d."verificationStatus",d."sourceUrl",d.attribution,d.license,d."storagePolicy",
      d."lastVerifiedAt",d."sourceId",s.name AS "sourceName",${scoreExpression} AS score
     FROM knowledge_chunks c
     JOIN knowledge_documents d ON d.id=c."documentId"
     JOIN knowledge_sources s ON s.id=d."sourceId"
     WHERE ${where} AND s."ingestionAllowed"=true AND ${mode === "semantic" ? "c.embedding IS NOT NULL" : `c."searchVector" @@ websearch_to_tsquery('simple',$1)`}
     ORDER BY ${orderExpression} LIMIT $${limitIndex}`,
    values,
  );
  const mapped = mapRows(result.rows, mode);
  return mode === "keyword"
    ? rankBm25(input.query, mapped).map((item) => ({
        ...item,
        retrievalMethods: ["keyword"],
      }))
    : mapped;
}

function oneChunkPerDocument(rows: ReturnType<typeof mapRows>) {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (seen.has(row.documentId)) return [];
    seen.add(row.documentId);
    return [{ ...row, id: row.documentId }];
  });
}

/** Public records are always searchable; private records require a server-derived owner ID. */
export async function retrieveKnowledge(
  input: unknown,
  ownerId: string | null = null,
  signal?: AbortSignal,
) {
  const started = performance.now();
  const query = knowledgeSearchSchema.parse(input);
  const environment = getServerEnvironment();
  let semantic: ReturnType<typeof mapRows> = [];
  let semanticStatus: "available" | "disabled" | "failed" = "disabled";
  let embeddingTokens: number | null = null;
  let embeddingCostUsd: number | null = null;
  let embeddingLatencyMs: number | null = null;
  if (environment.OPENROUTER_API_KEY && environment.DATABASE_URL) {
    try {
      if (signal?.aborted) throw new Error("Request cancelled");
      const embedding = await requestEmbeddings([query.query], {
        apiKey: environment.OPENROUTER_API_KEY,
        model: environment.RAG_EMBEDDING_MODEL,
        dimensions: environment.RAG_EMBEDDING_DIMENSIONS,
        inputType: "search_query",
        timeoutMs: 5_000,
        costPerMillionUsd:
          environment.OPENROUTER_EMBEDDING_COST_PER_MILLION_USD,
        signal,
      });
      semantic = await queryRows(
        query,
        ownerId,
        "semantic",
        embedding.vectors[0],
      );
      semanticStatus = "available";
      embeddingTokens = embedding.promptTokens;
      embeddingCostUsd = embedding.estimatedCostUsd;
      embeddingLatencyMs = embedding.latencyMs;
    } catch (error) {
      semanticStatus = "failed";
      serverLogger.warn("rag.semantic_fallback", {
        errorType: error instanceof Error ? error.name : "unknown",
        providerErrorCode:
          error instanceof EmbeddingProviderError ? error.code : null,
      });
    }
  }
  if (signal?.aborted) throw new Error("Request cancelled");
  const keyword = await queryRows(query, ownerId, "keyword");
  const evidence = reciprocalRankFusion([
    oneChunkPerDocument(semantic),
    oneChunkPerDocument(keyword),
  ])
    .slice(0, query.limit)
    .map((item) => ({
      ...item,
      retrievedAt: new Date().toISOString(),
    })) as KnowledgeEvidence[];
  const elapsedMs = Math.max(0, Math.round(performance.now() - started));
  serverLogger.info("rag.retrieval", {
    resultCount: evidence.length,
    semanticStatus,
    keywordResultCount: keyword.length,
    embeddingTokens,
    embeddingCostUsd,
    embeddingLatencyMs,
    latencyMs: elapsedMs,
  });
  return {
    evidence,
    metrics: {
      semanticStatus,
      keywordResultCount: keyword.length,
      embeddingTokens,
      embeddingCostUsd,
      embeddingLatencyMs,
      latencyMs: elapsedMs,
    },
  };
}
