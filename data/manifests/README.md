# Dataset manifests and update policy

Each destination manifest records dataset version, checked date, coverage counts, source owner, attribution, license/policy and permitted storage. The Jaipur manifest is deliberately explicit about empty data arrays and uncertain reuse terms.

`generated/` is written by the importer and ignored by Git. It contains an import report and quarantined invalid records; inspect and resolve every quarantine before applying a dataset. Never put credentials, traveler PII or production payloads in catalog files or reports.
