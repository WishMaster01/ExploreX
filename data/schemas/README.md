# Dataset schema ownership

Runtime source of truth is the Zod schema module [`lib/domain/dataset-schemas.ts`](../../lib/domain/dataset-schemas.ts), built on canonical domain schemas in [`lib/domain/travel.ts`](../../lib/domain/travel.ts). JSON files in sibling dataset directories are parsed against these schemas by `scripts/import-india-catalog.mjs` and validated in tests. Do not create parallel handwritten JSON Schema definitions; generate/publish JSON Schema only if a consumer requires it.

Records use stable kebab-case IDs, ISO country/state codes, IANA timezones, optional coordinates, explicit multi-category IDs, provenance status and `lastCheckedAt`. Each record includes evidence URLs, attribution and a permitted-use note. Missing values are omitted, not replaced with estimates. `verificationStatus` describes record review state; nested `source.status` is scoped to the fact represented by that field.
