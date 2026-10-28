import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  datasetDestinationSchema,
  datasetExperienceSchema,
  datasetGuideSchema,
  datasetHotelSchema,
  datasetManifestSchema,
  datasetPlaceSchema,
  datasetRestaurantSchema,
  jaipurCatalogSchema,
  taxonomySchema,
  unmanifestedEvidenceReferences,
  unknownCategoryReferences,
} from "../lib/domain/dataset-schemas.ts";

const root = path.resolve(import.meta.dirname, "..");
const generatedDir = path.join(root, "data", "manifests", "generated");
const quarantine = [];
const missingFieldReports = [];
const warnings = [];
const summary = { imported: {}, rejected: {}, duplicates: 0, applied: false };
const apply = process.argv.includes("--apply");

async function readDataset(relativePath) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw);
}

function noteIssues(dataset, record, issues) {
  const details = issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));
  const missing = details.filter(
    ({ code, message }) =>
      code === "invalid_type" && /undefined|received undefined/i.test(message),
  );
  if (missing.length)
    missingFieldReports.push({
      dataset,
      id: record?.id ?? null,
      fields: missing.map(({ path: field }) => field),
    });
  quarantine.push({ dataset, record, errors: details });
}

function parseRecords(dataset, records, schema) {
  if (!Array.isArray(records)) {
    noteIssues(dataset, records, [
      { path: [], code: "invalid_type", message: "Expected an array" },
    ]);
    return [];
  }
  const accepted = [];
  const seen = new Set();
  for (const record of records) {
    const parsed = schema.safeParse(record);
    if (!parsed.success) {
      noteIssues(dataset, record, parsed.error.issues);
      continue;
    }
    if (seen.has(parsed.data.id)) {
      summary.duplicates += 1;
      noteIssues(dataset, record, [
        {
          path: ["id"],
          code: "duplicate",
          message: `Duplicate stable id: ${parsed.data.id}`,
        },
      ]);
      continue;
    }
    seen.add(parsed.data.id);
    accepted.push(parsed.data);
  }
  summary.imported[dataset] = accepted.length;
  summary.rejected[dataset] = quarantine.filter(
    (item) => item.dataset === dataset,
  ).length;
  return accepted;
}

let taxonomy;
let manifest;
let destination;
let catalog;
try {
  const rawTaxonomy = await readDataset("data/taxonomy/categories.json");
  const parsedTaxonomy = taxonomySchema.safeParse(rawTaxonomy);
  if (!parsedTaxonomy.success)
    noteIssues("taxonomy", rawTaxonomy, parsedTaxonomy.error.issues);
  else taxonomy = parsedTaxonomy.data;

  const rawManifest = await readDataset("data/manifests/jaipur.json");
  const parsedManifest = datasetManifestSchema.safeParse(rawManifest);
  if (!parsedManifest.success)
    noteIssues("manifest", rawManifest, parsedManifest.error.issues);
  else manifest = parsedManifest.data;

  const rawDestination = await readDataset("data/destinations/jaipur.json");
  const parsedDestination = datasetDestinationSchema.safeParse(rawDestination);
  if (!parsedDestination.success)
    noteIssues("destinations", rawDestination, parsedDestination.error.issues);
  else destination = parsedDestination.data;
  summary.imported.destinations = destination ? 1 : 0;
  summary.rejected.destinations = destination ? 0 : 1;

  const places = parseRecords(
    "places",
    await readDataset("data/places/jaipur.json"),
    datasetPlaceSchema,
  );
  const restaurants = parseRecords(
    "restaurants",
    await readDataset("data/restaurants/jaipur.json"),
    datasetRestaurantSchema,
  );
  const hotels = parseRecords(
    "hotels",
    await readDataset("data/hotels/jaipur.json"),
    datasetHotelSchema,
  );
  const experiences = parseRecords(
    "experiences",
    await readDataset("data/experiences/jaipur.json"),
    datasetExperienceSchema,
  );
  const travelGuide = datasetGuideSchema.safeParse(
    await readDataset("data/travel-guides/jaipur.json"),
  );
  if (!travelGuide.success)
    noteIssues("travelGuides", null, travelGuide.error.issues);
  summary.imported.travelGuides = travelGuide.success ? 1 : 0;
  summary.rejected.travelGuides = travelGuide.success ? 0 : 1;

  const validRecords = [
    ...(destination ? [destination] : []),
    ...places,
    ...restaurants,
    ...hotels,
    ...experiences,
    ...(travelGuide.success ? [travelGuide.data] : []),
  ];
  const globalIds = new Set();
  for (const record of validRecords) {
    if (globalIds.has(record.id)) {
      summary.duplicates += 1;
      quarantine.push({
        dataset: "catalog",
        record,
        errors: [
          {
            path: "id",
            code: "duplicate",
            message: `Duplicate catalog id: ${record.id}`,
          },
        ],
      });
    }
    globalIds.add(record.id);
  }

  if (taxonomy && destination && travelGuide.success) {
    const fullCatalog = {
      destination,
      places,
      restaurants,
      hotels,
      experiences,
      travelGuide: travelGuide.data,
    };
    for (const invalidReference of unknownCategoryReferences(
      fullCatalog,
      taxonomy,
    )) {
      warnings.push(`Unknown taxonomy reference: ${invalidReference}`);
    }
    if (!warnings.length) {
      const parsedCatalog = jaipurCatalogSchema.safeParse(fullCatalog);
      if (!parsedCatalog.success)
        noteIssues("catalog", fullCatalog, parsedCatalog.error.issues);
      else catalog = parsedCatalog.data;
    }
  } else {
    warnings.push(
      "Catalog cannot be assembled until taxonomy, destination and guide validate.",
    );
  }

  if (manifest) {
    const actualCounts = {
      destinations: destination ? 1 : 0,
      places: places.length,
      restaurants: restaurants.length,
      hotels: hotels.length,
      experiences: experiences.length,
      travelGuides: travelGuide.success ? 1 : 0,
    };
    if (
      JSON.stringify(actualCounts) !== JSON.stringify(manifest.recordCounts)
    ) {
      warnings.push("Manifest recordCounts differ from schema-valid files.");
    }
    if (destination && manifest.destinationId !== destination.id) {
      warnings.push(
        `Manifest destinationId ${manifest.destinationId} does not match destination ${destination.id}.`,
      );
    }
    if (catalog) {
      for (const reference of unmanifestedEvidenceReferences(
        catalog,
        manifest,
      )) {
        warnings.push(`Evidence URL is absent from the manifest: ${reference}`);
      }
    }
  }

  if (apply) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is required with --apply");
    if (!catalog || !taxonomy || quarantine.length || warnings.length) {
      throw new Error(
        "Refusing --apply while records are invalid, quarantined, or manifest checks warn.",
      );
    }
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    try {
      await client.connect();
      await client.query("BEGIN");
      for (const [key, content] of [
        ["india:jaipur", catalog],
        ["india:taxonomy", taxonomy],
        ["india:jaipur:manifest", manifest],
      ]) {
        await client.query(
          `INSERT INTO "site_datasets" ("key", "content", "updatedAt")
           VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
           ON CONFLICT ("key") DO UPDATE SET
             "content" = EXCLUDED."content", "updatedAt" = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(content)],
        );
      }
      await client.query("COMMIT");
      summary.applied = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  }
} catch (error) {
  warnings.push(
    error instanceof Error ? error.message : "Unexpected import failure",
  );
}

summary.totalAccepted = Object.values(summary.imported).reduce(
  (sum, count) => sum + count,
  0,
);
summary.totalQuarantined = quarantine.length;
summary.warnings = warnings;
summary.missingFieldReports = missingFieldReports;
summary.finishedAt = new Date().toISOString();
await mkdir(generatedDir, { recursive: true });
await writeFile(
  path.join(generatedDir, "jaipur-import-report.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
await writeFile(
  path.join(generatedDir, "jaipur-quarantine.json"),
  `${JSON.stringify(quarantine, null, 2)}\n`,
);
console.log(JSON.stringify(summary, null, 2));
if (warnings.length || quarantine.length) process.exitCode = 1;
