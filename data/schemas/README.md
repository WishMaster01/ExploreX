# Dataset schemas

The canonical Zod runtime schemas are in [`lib/domain/travel-data-schemas.ts`](../../lib/domain/travel-data-schemas.ts). `lib/domain/dataset-schemas.ts` remains the compatibility contract for the earlier Jaipur API payload.

Destination records use stable IDs, a geographic type, ISO country code, optional coordinates and IANA timezone, parent links, aliases, popularity score, category IDs, source references, status, and provenance. Popularity is a product rank rather than a verified tourism statistic. Entity records share stable IDs, destination/category/source references, verification status, provenance, and last-verification timestamps. Event dates, route measurements, timezones, prices, and verified-source requirements have explicit validation rules.

The travel guide schema separates source-backed factual claims with freshness limits from editorial advice. Empty arrays are allowed; unverified facts must stay absent. Provider responses should be mapped to these ExploreX contracts before reaching UI components.
