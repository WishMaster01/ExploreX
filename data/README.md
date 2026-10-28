# ExploreX destination datasets

The first structured India catalog is intentionally limited to Jaipur. Do not treat this as complete Jaipur coverage or complete India coverage. The checked-in dataset currently has a sourced city coordinate, four official tourism attraction names, and a short uncertainty guide. Restaurant, hotel, and standalone experience arrays are empty because individually attributable, permissible records have not yet been curated. Missing records are not zero-price or “free” records.

## Data layout

- `destinations/`: destination identity, country/state codes, optional city coordinates, IANA timezone and multi-category labels.
- `places/`: named places/attractions with optional coordinates and field-level source metadata.
- `restaurants/`, `hotels/`, `experiences/`: separately typed records; do not force unknown inventory into these files.
- `travel-guides/`: clearly sourced/curated guide summary and uncertainty statement.
- `taxonomy/`: stable kebab-case multi-label categories for the requested travel themes.
- `schemas/`: schema ownership instructions. Runtime Zod schemas live in `lib/domain/dataset-schemas.ts` and canonical primitives in `lib/domain/travel.ts`.
- `manifests/`: source ownership, attribution, license/policy, storage restrictions, record counts, coverage and checked dates. Importer-generated reports/quarantine are ignored under `manifests/generated/`.

Each record separates factual `source`/`verificationStatus` from `categorySource`. Jaipur's attraction names are provider-sourced from Rajasthan Tourism; taxonomy assignments are editorial (`CURATED`). `lastCheckedAt` is the date a person re-opened the linked source. `retrievedAt` stays null unless an actual provider retrieval timestamp is recorded. Unknown coordinates, prices, ratings, hours, images and availability remain absent.

## Verify and add data

1. Start with a destination represented in an official tourism authority or civic source. Add its country code, state/UT code, IANA timezone, and coordinates only when a suitable source states the point represented (city center versus attraction point matters).
2. For each place/restaurant/hotel/experience, capture the exact source URL, source owner, factual fields supported by that page, source attribution, storage permission, and checked date. Prefer official tourism and attraction/operator sites. Do not bulk scrape. Review the source copyright and third-party image/text restrictions; a tourism page may contain embedded third-party content with different terms.
3. Add stable IDs and one or more taxonomy IDs. Record taxonomy classification provenance separately from factual verification. Never infer family suitability, accessibility, affordability, safety, or “hidden gem” status without an explicit editorial review policy.
4. Leave unsupported fields out. A zero amount means an evidenced no-cost fact only when that fact is explicitly sourced and its scope/date are captured; it must never be used to stand for unknown price.
5. Update the destination JSON, relevant entity file, manifest counts, source/license matrix and `lastCheckedAt`. Add a schema test if the shape or validation rule changes.
6. Run `npm run data:validate` with Node.js 22.6+ (the importer uses Node's built-in TypeScript stripping; the app's runtime requirement is separate). Review `data/manifests/generated/jaipur-import-report.json` and `jaipur-quarantine.json`; fix all warnings/rejected records and rerun. Validation is offline and writes no DB rows.
7. To idempotently apply the validated catalog to PostgreSQL's existing `site_datasets` table, first apply the committed `site_datasets` migration, then use `npm run data:import:jaipur` with `DATABASE_URL` set. It refuses any warning, schema failure or quarantine and upserts stable keys in one transaction. It does not change Prisma schema or delete other dataset keys.
8. The application fallback uses checked-in data. `GET /api/catalog/jaipur` exposes the validated catalog, taxonomy and source manifest. Additional destinations require their own validated dataset, manifest, tests, and explicit route/catalog registration; do not claim national coverage from one city.

### Source and licensing record for Jaipur

The Jaipur coordinates are sourced from the [Jaipur Municipal Corporation Heritage Cell city profile](https://pinkcity.jaipurmcheritage.org/Cityexplorepage/CityProfile.aspx). Attraction names are sourced from [Rajasthan Tourism's Jaipur page](https://www.tourism.rajasthan.gov.in/jaipur.html), [Amber Palace page](https://www.tourism.rajasthan.gov.in/amber-palace.html), and [Hawa Mahal page](https://www.tourism.rajasthan.gov.in/hawa-mahal.html). Rajasthan Tourism's [website copyright policy](https://www.tourism.rajasthan.gov.in/circulars-and-policies/privacy-policy.html) permits accurate reproduction with prominent acknowledgement, but excludes third-party material. The municipal profile's reuse terms were not identified in this audit; only its factual city coordinate and attribution are stored, and terms should be reconfirmed before expanding that source. No OSM/Geofabrik data or third-party images are included.
