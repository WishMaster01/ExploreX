import "dotenv/config";
import pg from "pg";
import { exploreCities } from "../lib/data/cities.ts";
import { DESTINATIONS } from "../lib/data/destinations.ts";
import { aiFeatures } from "../lib/data/ai-features.ts";
import { travelSignals } from "../lib/data/travel-signals.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL must be configured to seed city guides.");

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  for (const city of exploreCities) {
    await client.query(
      `INSERT INTO "city_guides" ("slug", "name", "country", "region", "content", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT ("slug") DO UPDATE SET
         "name" = EXCLUDED."name", "country" = EXCLUDED."country",
         "region" = EXCLUDED."region", "content" = EXCLUDED."content",
         "updatedAt" = CURRENT_TIMESTAMP`,
      [city.slug, city.name, city.country, city.region, JSON.stringify(city)],
    );
  }
  const datasets = [
    ["destinations", DESTINATIONS],
    ["ai-features", aiFeatures],
    ["travel-signals", travelSignals],
  ];
  for (const [key, content] of datasets) {
    await client.query(
      `INSERT INTO "site_datasets" ("key", "content", "updatedAt")
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE SET
         "content" = EXCLUDED."content", "updatedAt" = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(content)],
    );
  }
  console.log(
    `Seeded ${exploreCities.length} city guides and ${datasets.length} site datasets.`,
  );
} finally {
  await client.end();
}
