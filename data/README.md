# ExploreX travel datasets

`catalogs/destinations.json` is the canonical destination catalog, `catalogs/travel-taxonomy.json` is the 16-category taxonomy, and `catalogs/source-registry.json` tracks attribution, licensing, permitted storage, freshness, and whether a source is used, integrated ephemerally, or only a candidate.

Each catalog destination has a folder under `destinations/<id>/` containing `destination.json`, `places.json`, `restaurants.json`, `hotels.json`, `experiences.json`, `events.json`, `routes.json`, `travel-guide.json`, and a generated `manifest.json`. Empty arrays and unavailable guide placeholders are intentional and do not claim that no real inventory exists.

Runtime schemas and the complete format are documented in [TRAVEL_DATA.md](../docs/TRAVEL_DATA.md) and [schemas/README.md](schemas/README.md). Jaipur is the only destination with sourced attraction records. Forty legacy destination records keep their previous coordinates but need source review; do not mark or present them as verified. The old top-level Jaipur JSON files remain for API compatibility; new normalized data lives under `destinations/jaipur-in/`.

Run the validation, manifest, report, and dry-run import commands using `npm run travel-data:validate`, `npm run travel-data:manifest`, `npm run travel-data:report`, and `npm run travel-data:import`. See [destination coverage](../docs/TRAVEL_DATA_COVERAGE.md) for counts generated from current files. Importing into PostgreSQL requires an explicit `--apply` and writes transactionally to the existing `site_datasets` table.
