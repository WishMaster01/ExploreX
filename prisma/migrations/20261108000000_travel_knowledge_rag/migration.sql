-- pgvector is the initial semantic index. Apply this migration only after
-- confirming the configured PostgreSQL service provides the vector extension.
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "KnowledgeVerificationStatus" AS ENUM (
  'VERIFIED', 'PROVIDER_SOURCED', 'COMMUNITY_SUBMITTED', 'ESTIMATED',
  'AI_GENERATED', 'STALE', 'UNAVAILABLE', 'REJECTED', 'CURATED', 'NEEDS_REVIEW'
);
CREATE TYPE "KnowledgeVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE "knowledge_sources" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "licenseStatus" TEXT NOT NULL,
  "license" TEXT NOT NULL,
  "termsUrl" TEXT,
  "attribution" TEXT NOT NULL,
  "storagePolicy" TEXT NOT NULL,
  "dataTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastCheckedAt" DATE NOT NULL,
  "ingestionAllowed" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_documents" (
  "id" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "recordHash" TEXT NOT NULL,
  "destinationId" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "factTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "language" TEXT NOT NULL DEFAULT 'en',
  "verificationStatus" "KnowledgeVerificationStatus" NOT NULL,
  "visibility" "KnowledgeVisibility" NOT NULL DEFAULT 'PUBLIC',
  "sourceUrl" TEXT NOT NULL,
  "attribution" TEXT NOT NULL,
  "license" TEXT NOT NULL,
  "storagePolicy" TEXT NOT NULL,
  "lastVerifiedAt" DATE,
  "ingestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceId" TEXT NOT NULL,
  "ownerId" TEXT,
  CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_documents_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "knowledge_documents_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "knowledge_documents_coordinates_check" CHECK (
    (("latitude" IS NULL) = ("longitude" IS NULL))
    AND ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90)
    AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
  ),
  CONSTRAINT "knowledge_documents_version_positive_check" CHECK ("version" > 0),
  CONSTRAINT "knowledge_documents_visibility_owner_check" CHECK (
    ("visibility" = 'PUBLIC' AND "ownerId" IS NULL)
    OR ("visibility" = 'PRIVATE' AND "ownerId" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "knowledge_documents_sourceId_sourceDocumentId_version_key"
  ON "knowledge_documents"("sourceId", "sourceDocumentId", "version");
CREATE UNIQUE INDEX "knowledge_documents_current_source_doc_key"
  ON "knowledge_documents"("sourceId", "sourceDocumentId") WHERE "isCurrent" = true;
CREATE INDEX "knowledge_documents_sourceId_sourceDocumentId_isCurrent_isActive_idx"
  ON "knowledge_documents"("sourceId", "sourceDocumentId", "isCurrent", "isActive");
CREATE INDEX "knowledge_documents_destinationId_verificationStatus_visibility_isCurrent_isActive_idx"
  ON "knowledge_documents"("destinationId", "verificationStatus", "visibility", "isCurrent", "isActive");
CREATE INDEX "knowledge_documents_ownerId_visibility_isCurrent_isActive_idx"
  ON "knowledge_documents"("ownerId", "visibility", "isCurrent", "isActive");
CREATE INDEX "knowledge_documents_latitude_longitude_idx"
  ON "knowledge_documents"(latitude, longitude);
CREATE INDEX "knowledge_documents_categoryIds_gin_idx"
  ON "knowledge_documents" USING GIN ("categoryIds");

CREATE TABLE "knowledge_chunks" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embedding" vector(1536),
  "embeddingModel" TEXT,
  "embeddingTokens" INTEGER,
  "searchVector" TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_chunks_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "knowledge_chunks_index_nonnegative_check" CHECK ("chunkIndex" >= 0),
  CONSTRAINT "knowledge_chunks_embedding_tokens_nonnegative_check"
    CHECK ("embeddingTokens" IS NULL OR "embeddingTokens" >= 0)
);
CREATE UNIQUE INDEX "knowledge_chunks_documentId_chunkIndex_key"
  ON "knowledge_chunks"("documentId", "chunkIndex");
CREATE INDEX "knowledge_chunks_documentId_idx" ON "knowledge_chunks"("documentId");
CREATE INDEX "knowledge_chunks_searchVector_gin_idx" ON "knowledge_chunks" USING GIN ("searchVector");
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx"
  ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;

CREATE TABLE "knowledge_ingestion_failures" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "sourceDocId" TEXT,
  "contentHash" TEXT,
  "stage" TEXT NOT NULL,
  "errorCode" TEXT NOT NULL,
  "details" VARCHAR(500) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMPTZ(3),
  CONSTRAINT "knowledge_ingestion_failures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_ingestion_failures_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "knowledge_ingestion_failures_sourceId_occurredAt_idx"
  ON "knowledge_ingestion_failures"("sourceId", "occurredAt");
CREATE INDEX "knowledge_ingestion_failures_resolvedAt_occurredAt_idx"
  ON "knowledge_ingestion_failures"("resolvedAt", "occurredAt");

COMMIT;
