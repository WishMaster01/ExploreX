# Decision 0005: PostgreSQL and pgvector for travel knowledge retrieval

**Status:** Accepted for the initial, small public Jaipur corpus; database rollout blocked on migration-baseline reconciliation.

## Context

ExploreX already uses PostgreSQL through Prisma. The initial factual corpus contains five records, so a separate vector service would add deployment and access-control surfaces without an observed scale or isolation requirement. Read-only inspection confirmed Neon PostgreSQL 17.11 and pgvector 0.8.0 availability. Existing `users` and `trips` tables exist, but `_prisma_migrations` is absent and Prisma reports all seven repository migrations pending; database rollout must wait for a safe migration baseline.

## Decision

Use the existing PostgreSQL database with pgvector (1536 dimensions), a cosine HNSW index, generated full-text search vectors plus GIN, relational source/document/chunk/failure tables, and application-side BM25 ranking over a bounded PostgreSQL FTS candidate set. Keep the vector and generated-column DDL in a reviewed SQL migration because Prisma does not express these features in the portable schema. Keep ingestion as a bounded operator-run script; do not add Qdrant, workers, or new infrastructure at this corpus size.

Retrieval must apply owner and publication filters before vector or keyword results are returned. If semantic search is unavailable, use the filtered keyword path. The planner must abstain when retrieved records do not cover required factual fields.

## Consequences

- No separate service or new runtime dependency is required; `pg` is already present.
- PostgreSQL needs pgvector installation permission, sufficient version support, and HNSW index capacity before migration rollout.
- Changing vector dimensions or model requires a coordinated rebuild.
- Operational and retrieval performance must be measured before considering another vector store.
- Full source revalidation, background ingestion, and semantic quality evaluation remain follow-up work.
