# Dataset manifests and update policy

Each canonical destination manifest records its schema version, generation time, dataset file paths and physical record counts, source references, coverage and validation status, freshness age, and any validation issues. It counts an unavailable travel-guide placeholder as one stored record; the guide's `UNAVAILABLE` status and manifest `coverageStatus: not_started` show that it provides no guide coverage. Source owner, attribution, license terms, and storage restrictions live in `data/catalogs/source-registry.json`, referenced by stable source IDs. Jaipur's source policy explicitly records that the municipal city-profile reuse terms are unknown.

The legacy `data/manifests/jaipur.json` is a compatibility-import manifest and has its own legacy shape. It is not generated from the canonical per-destination manifests.

`generated/` is written by the importer and ignored by Git. It contains an import report and quarantined invalid records; inspect and resolve every quarantine before applying a dataset. Never put credentials, traveler PII or production payloads in catalog files or reports.
