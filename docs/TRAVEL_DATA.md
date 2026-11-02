# ExploreX travel data platform

## Canonical layout

- `data/catalogs/destinations.json` is the canonical destination catalog. The `DESTINATIONS` export in `lib/data/destinations.ts` is a typed, backward-compatible projection used by destination search, weather lookup, and existing map code.
- `data/catalogs/travel-taxonomy.json` is the canonical 16-category taxonomy, its legacy-compatible subcategory IDs, and shared tags. `flattenTravelTaxonomy` is a read-only compatibility adapter for the older Jaipur dataset contract.
- `data/catalogs/source-registry.json` describes sources actually used by curated records, ephemeral provider integrations, and sources that remain candidates. A candidate is not a license grant.
- `data/destinations/<id>/` contains `destination.json`, place, restaurant, hotel, experience, event, route, guide, and generated manifest files. Empty arrays mean no records have been accepted; they do not mean the destination lacks those businesses or activities.
- The earlier `data/destinations/jaipur.json`, `data/places/jaipur.json`, and related Jaipur files remain as compatibility data for the Phase 2 response. New application search and normalized destination catalog APIs use the canonical catalog and `data/destinations/jaipur-in/`.
- Runtime schemas live in `lib/domain/travel-data-schemas.ts`; prior Jaipur contracts remain in `lib/domain/dataset-schemas.ts`.

## Data and provenance rules

Destination records contain stable IDs, labels, geographic type, city/state/country, ISO 3166-1 alpha-2 country code, parent link, aliases, coordinates, optional IANA timezone, product popularity score, category IDs, source references, and verification state. Goa is a region, Bali an island, Singapore a country, and Maldives a country parent of Malé. Existing Malé city coordinates remain attached to Malé. The extra Maldives country record has no guessed coordinate.

The `popularity` value is the original product ranking score on a 0–100 scale; it is not a tourism statistic. Jaipur's city-center coordinate and four attraction names have source references in the registry. Forty original destination records retain their original coordinates and aliases but are marked `NEEDS_REVIEW`, because the legacy code did not record coordinate sources or verification dates. They must not be described as verified. Restaurant, hotel, experience, event, and route collections remain empty until sourceable records are available.

Statuses are `VERIFIED`, `ESTIMATED`, `USER_PROVIDED`, `AI_GENERATED`, `NEEDS_REVIEW`, and `UNAVAILABLE`. `VERIFIED` requires a source URL or provider record, a registry reference for stored facts, and a verification date. Category assignments are editorial taxonomy metadata; they do not establish safety, family suitability, cost, accessibility, or traveler preference. Missing facts stay missing. Hotel rates are estimates only when explicitly typed as estimates with an as-of timestamp; route results must identify a provider and retrieval time. Straight-line estimates cannot claim a drive/transit mode. Events with unconfirmed dates cannot be marked confirmed.

Travel guides separate `factualClaims` with source references and freshness limits from `editorialAdvice`. Time-sensitive transport, weather, safety, access, event, and rate information needs a source and a short freshness window appropriate to the claim. The report flags verified records older than 365 days; this default is a review trigger, not a guarantee that facts remain current.

## Sources, rights, and integrations

The actual Jaipur records use the Jaipur Municipal Corporation Heritage Cell city profile for the city coordinate and Rajasthan Tourism attraction pages for names. Rajasthan Tourism's copyright page requires prominent acknowledgement for accurate reproduction and excludes third-party material. The city profile's reuse terms were not identified, so only the factual coordinate and attribution are stored; reconfirm terms before expanding that source. No OpenStreetMap extract, Geofabrik data, hotel/restaurant listing, image, or third-party page text is included.

The source registry records the current access and reuse limitations found for candidate sources. OpenStreetMap data is ODbL and requires attribution; derived database share-alike obligations need review before importing. Geofabrik extracts are OSM-derived and carry the same license concern. Google Places content has storage restrictions; Place IDs have a documented exception, and results need required Google/third-party attribution. Google Routes remains a candidate and route response storage must be reviewed. Open-Meteo's free endpoint is non-commercial and its weather data is CC BY 4.0; the existing weather route fetches current weather ephemerally, so confirm product eligibility or use a commercial plan before commercial deployment. Incredible India platform terms prohibit reproducing content absent consent or other authorization. Ministry of Tourism and data.gov.in datasets require dataset-specific license and update-cycle review. Amadeus products have different test/production access and terms; no adapter or credentials are configured.

No new provider adapter or infrastructure dependency was added. Existing provider ports are in `lib/travel-data/ports.ts`; the Google Places integration remains optional. The offline fixture provider only returns the four source-reviewed Jaipur names and never fills in coordinates, prices, hours, ratings, or availability. Configure `TRAVEL_DATA_PROVIDER=auto` (default), `disabled`, `fixture`, or `google_places`. Google Places requires server-only `GOOGLE_MAPS_API_KEY`; missing credentials produce the unavailable adapter. Never expose credentials to client code.

## Commands

Node.js 22.6 or newer is required by the dataset scripts because they use built-in TypeScript stripping. The app's separate engine requirement remains in `package.json`.

- `npm run travel-data:validate` validates catalogs, schemas, source/category/geographic references, record IDs, likely duplicates, manifests, and freshness metadata. It exits nonzero on errors and records details in the ignored `data/manifests/generated/travel-data-report.json`.
- `npm run travel-data:manifest` regenerates every destination manifest and `docs/TRAVEL_DATA_COVERAGE.md` from the current JSON files and validation results.
- `npm run travel-data:report` regenerates the coverage report from the current files and checks manifests.
- `npm run travel-data:import` validates and builds an import plan in dry-run mode. It performs no database writes.
- `npm run travel-data:import -- --apply` explicitly applies validated data with a PostgreSQL transaction and `ON CONFLICT` upserts to the existing `site_datasets` table. It requires `DATABASE_URL`; it never deletes other keys.
- `npm run data:validate` and `npm run data:import:jaipur` remain the Phase 2 legacy Jaipur validator/importer. The latter writes Jaipur's older compatibility keys.

No Prisma schema change or migration is required. `travel-data:import -- --apply` requires the existing `site_datasets` table migration to have been deployed. Database apply was not run as part of this implementation because it writes to the configured database.

## Application integration

`DESTINATIONS` now comes from the canonical JSON catalog, so existing search, map, and weather flows keep their familiar shape while receiving stable IDs, types, country codes, aliases, and review status. Destinations without coordinates are excluded from coordinate plotting and weather lookup. The Journey Map now says that most legacy coordinates still need source verification and no longer draws a fabricated flight trail. `GET /api/catalog/<destination>` returns schema-validated ExploreX models for each catalog destination; Jaipur also includes a `legacy` compatibility payload. Checked-in JSON is the offline fallback, while validated dataset keys in PostgreSQL can override it after explicit import.

## Adding or updating a destination

1. Choose a stable kebab-case ID and geographic type. Record city, region/island/country distinctions and parent relationships. Preserve existing IDs and coordinates unless a separately reviewed correction is made.
2. Add a destination to `data/catalogs/destinations.json` with ISO country code, known aliases, timezone only when known, and explicit source/provenance status. Keep unknown coordinates null.
3. Create `data/destinations/<id>/destination.json`, empty arrays for all collections, an unavailable guide placeholder, and a manifest by running `npm run travel-data:manifest`.
4. Add records only after checking exact source pages, attribution, permitted storage, field scope, freshness, and source registry entries. Do not scrape restricted sites or infer missing facts.
5. Run `npm run travel-data:manifest`, `npm run travel-data:validate`, `npm run travel-data:report`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Review generated issue/quarantine output and the coverage diff.
6. For an approved database rollout, verify the existing migration is deployed, configure `DATABASE_URL`, inspect the dry-run import plan, then explicitly run `npm run travel-data:import -- --apply`.

See [generated destination coverage](TRAVEL_DATA_COVERAGE.md) and [dataset update notes](../data/README.md).
