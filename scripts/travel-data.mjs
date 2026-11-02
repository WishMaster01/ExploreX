import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  applyTravelDataImportPlan,
  createTravelDataImportPlan,
  findLikelyDuplicateNames,
} from "../lib/travel-data/import.ts";
import {
  travelDestinationManifestSchema,
  travelDestinationCatalogSchema,
  travelDestinationSchema,
  travelEventSchema,
  travelExperienceSchema,
  travelGuideSchema,
  travelHotelSchema,
  travelPlaceSchema,
  travelRestaurantSchema,
  travelRouteSchema,
  travelSourceRegistrySchema,
  travelTaxonomySchema,
} from "../lib/domain/travel-data-schemas.ts";

const root = path.resolve(import.meta.dirname, "..");
const command = process.argv[2] ?? "validate";
const apply = process.argv.includes("--apply");
const collections = {
  places: travelPlaceSchema,
  restaurants: travelRestaurantSchema,
  hotels: travelHotelSchema,
  experiences: travelExperienceSchema,
  events: travelEventSchema,
  routes: travelRouteSchema,
};
const issues = [];
const recordsByDestination = new Map();
const summary = {
  destinations: 0,
  records: {},
  verified: 0,
  needsReview: 0,
  unavailable: 0,
  duplicates: [],
  issues,
};

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function addIssues(filePath, id, zodIssues) {
  for (const issue of zodIssues) {
    issues.push({
      file: filePath,
      id: id ?? null,
      path: issue.path.join("."),
      message: issue.message,
    });
  }
}

function parse(schema, value, filePath, id = value?.id ?? null) {
  const result = schema.safeParse(value);
  if (!result.success) addIssues(filePath, id, result.error.issues);
  return result.success ? result.data : null;
}

const registryRaw = await readJson("data/catalogs/source-registry.json");
const registry = parse(
  travelSourceRegistrySchema,
  registryRaw,
  "data/catalogs/source-registry.json",
);
const taxonomyRaw = await readJson("data/catalogs/travel-taxonomy.json");
const taxonomy = parse(
  travelTaxonomySchema,
  taxonomyRaw,
  "data/catalogs/travel-taxonomy.json",
);
const destinationCatalogRaw = await readJson("data/catalogs/destinations.json");
const parsedDestinationCatalog = parse(
  travelDestinationCatalogSchema,
  destinationCatalogRaw,
  "data/catalogs/destinations.json",
);
const validDestinationCatalog = parsedDestinationCatalog?.destinations ?? [];
summary.destinations = validDestinationCatalog.length;
const destinationIds = new Set(validDestinationCatalog.map(({ id }) => id));
const taxonomyIds = new Set([
  ...(taxonomy?.categories.flatMap((category) => [
    category.id,
    ...category.subcategories.map((item) => item.id),
  ]) ?? []),
  ...(taxonomy?.tags.map(({ id }) => id) ?? []),
]);
const sourcesById = new Map(
  registry?.sources.map((source) => [source.id, source]) ?? [],
);
const usedSourceIds = new Set();
const allRecordIds = new Map();
const expectedFiles = [
  "destination.json",
  ...Object.keys(collections).map((key) => `${key}.json`),
  "travel-guide.json",
];

for (const destination of validDestinationCatalog) {
  allRecordIds.set(destination.id, "data/catalogs/destinations.json");
  if (destination.status === "VERIFIED") summary.verified += 1;
  else if (destination.status === "NEEDS_REVIEW") summary.needsReview += 1;
  else if (destination.status === "UNAVAILABLE") summary.unavailable += 1;
  if (destination.status === "VERIFIED" && !destination.sourceRefs.length)
    issues.push({
      file: "data/catalogs/destinations.json",
      id: destination.id,
      path: "sourceRefs",
      message: "Verified destination has no source reference",
    });
  if (
    destination.provenance.sourceUrl &&
    !destination.sourceRefs.some(
      (sourceId) =>
        sourcesById.get(sourceId)?.url === destination.provenance.sourceUrl,
    )
  )
    issues.push({
      file: "data/catalogs/destinations.json",
      id: destination.id,
      path: "provenance.sourceUrl",
      message:
        "Destination provenance URL is not represented by a referenced registry source",
    });
  for (const sourceId of destination.sourceRefs) {
    const source = sourcesById.get(sourceId);
    if (!source)
      issues.push({
        file: "data/catalogs/destinations.json",
        id: destination.id,
        path: "sourceRefs",
        message: `Unknown source reference ${sourceId}`,
      });
    else if (source.currentUse !== "used")
      issues.push({
        file: "data/catalogs/destinations.json",
        id: destination.id,
        path: "sourceRefs",
        message: `Source ${sourceId} is not permitted for current use`,
      });
    else usedSourceIds.add(sourceId);
  }
  for (const categoryId of destination.categoryIds)
    if (!taxonomyIds.has(categoryId))
      issues.push({
        file: "data/catalogs/destinations.json",
        id: destination.id,
        path: "categoryIds",
        message: `Unknown taxonomy ID ${categoryId}`,
      });
  if (
    destination.parentDestinationId &&
    !destinationIds.has(destination.parentDestinationId)
  ) {
    issues.push({
      file: "data/catalogs/destinations.json",
      id: destination.id,
      path: "parentDestinationId",
      message: `Unknown parent ${destination.parentDestinationId}`,
    });
  }
  const directory = `data/destinations/${destination.id}`;
  const files = await readdir(path.join(root, directory)).catch(() => []);
  for (const required of expectedFiles)
    if (!files.includes(required))
      issues.push({
        file: `${directory}/${required}`,
        id: destination.id,
        path: "",
        message: "Required dataset file is missing",
      });
  const rawDestination = await readJson(`${directory}/destination.json`).catch(
    (error) => {
      issues.push({
        file: `${directory}/destination.json`,
        id: destination.id,
        path: "",
        message: `Cannot read destination record: ${error.message}`,
      });
      return null;
    },
  );
  const localDestination = rawDestination
    ? parse(
        travelDestinationSchema,
        rawDestination,
        `${directory}/destination.json`,
      )
    : null;
  if (
    localDestination &&
    JSON.stringify(localDestination) !== JSON.stringify(destination)
  ) {
    issues.push({
      file: `${directory}/destination.json`,
      id: destination.id,
      path: "",
      message: "Destination record differs from canonical destination catalog",
    });
  }
  const dirRecords = [];
  if (localDestination) dirRecords.push(localDestination);
  const counts = { destination: localDestination ? 1 : 0 };
  const sourceReferences = new Set(destination.sourceRefs);
  const recordCollections = {};

  for (const [name, schema] of Object.entries(collections)) {
    const file = `${directory}/${name}.json`;
    const rows = await readJson(file).catch((error) => {
      issues.push({
        file,
        id: null,
        path: "",
        message: `Cannot read dataset: ${error.message}`,
      });
      return null;
    });
    if (!Array.isArray(rows)) {
      issues.push({
        file,
        id: null,
        path: "",
        message: "Expected a JSON array",
      });
      recordCollections[name] = [];
      counts[name] = 0;
      continue;
    }
    const validRows = [];
    const localIds = new Set();
    for (const row of rows) {
      const record = parse(schema, row, file);
      if (!record) continue;
      if (record.destinationId !== destination.id)
        issues.push({
          file,
          id: record.id,
          path: "destinationId",
          message: `Expected ${destination.id}, received ${record.destinationId}`,
        });
      if (localIds.has(record.id))
        issues.push({
          file,
          id: record.id,
          path: "id",
          message: "Duplicate stable ID in this dataset",
        });
      localIds.add(record.id);
      if (allRecordIds.has(record.id))
        issues.push({
          file,
          id: record.id,
          path: "id",
          message: `Duplicate stable ID also found in ${allRecordIds.get(record.id)}`,
        });
      else allRecordIds.set(record.id, file);
      for (const categoryId of record.categoryIds ?? [])
        if (!taxonomyIds.has(categoryId))
          issues.push({
            file,
            id: record.id,
            path: "categoryIds",
            message: `Unknown taxonomy ID ${categoryId}`,
          });
      for (const sourceId of record.sourceRefs) {
        const source = sourcesById.get(sourceId);
        if (!source)
          issues.push({
            file,
            id: record.id,
            path: "sourceRefs",
            message: `Unknown source reference ${sourceId}`,
          });
        else {
          sourceReferences.add(sourceId);
          usedSourceIds.add(sourceId);
          if (source.currentUse !== "used")
            issues.push({
              file,
              id: record.id,
              path: "sourceRefs",
              message: `Source ${sourceId} is not permitted for current use`,
            });
        }
      }
      if (record.verificationStatus === "VERIFIED") {
        summary.verified += 1;
        if (!record.sourceRefs.length)
          issues.push({
            file,
            id: record.id,
            path: "sourceRefs",
            message: "Verified record has no source reference",
          });
        if (
          record.provenance.sourceUrl &&
          !record.sourceRefs.some(
            (sourceId) =>
              sourcesById.get(sourceId)?.url === record.provenance.sourceUrl,
          )
        ) {
          issues.push({
            file,
            id: record.id,
            path: "provenance.sourceUrl",
            message:
              "Provenance URL is not represented by a referenced registry source",
          });
        }
      } else if (record.verificationStatus === "NEEDS_REVIEW")
        summary.needsReview += 1;
      for (const categoryId of record.categoryIds ?? [])
        if (!taxonomyIds.has(categoryId))
          issues.push({
            file,
            id: record.id,
            path: "categoryIds",
            message: `Unknown taxonomy ID ${categoryId}`,
          });
      validRows.push(record);
    }
    for (const duplicate of findLikelyDuplicateNames(validRows)) {
      summary.duplicates.push({
        destinationId: destination.id,
        dataset: name,
        normalizedName: duplicate.normalizedName,
        file,
        recordId: duplicate.id,
      });
      issues.push({
        file,
        id: duplicate.id,
        path: "name",
        message: `Likely duplicate ${name} name: ${duplicate.normalizedName}`,
      });
    }
    recordCollections[name] = validRows;
    dirRecords.push(...validRows);
    counts[name] = validRows.length;
  }

  const localEntityIds = new Set(dirRecords.map(({ id }) => id));
  for (const [collection, records] of Object.entries(recordCollections)) {
    for (const record of records) {
      if (record.locationRef && !localEntityIds.has(record.locationRef))
        issues.push({
          file: `${directory}/${collection}.json`,
          id: record.id,
          path: "locationRef",
          message: `Unknown place reference ${record.locationRef}`,
        });
      if (record.venueRef && !localEntityIds.has(record.venueRef))
        issues.push({
          file: `${directory}/${collection}.json`,
          id: record.id,
          path: "venueRef",
          message: `Unknown venue reference ${record.venueRef}`,
        });
      if (
        record.originDestinationId &&
        !destinationIds.has(record.originDestinationId)
      )
        issues.push({
          file: `${directory}/${collection}.json`,
          id: record.id,
          path: "originDestinationId",
          message: `Unknown route origin ${record.originDestinationId}`,
        });
      if (
        record.destinationDestinationId &&
        !destinationIds.has(record.destinationDestinationId)
      )
        issues.push({
          file: `${directory}/${collection}.json`,
          id: record.id,
          path: "destinationDestinationId",
          message: `Unknown route destination ${record.destinationDestinationId}`,
        });
    }
  }

  const guideFile = `${directory}/travel-guide.json`;
  const rawGuide = await readJson(guideFile).catch((error) => {
    issues.push({
      file: guideFile,
      id: null,
      path: "",
      message: `Cannot read travel guide: ${error.message}`,
    });
    return null;
  });
  const guide = rawGuide ? parse(travelGuideSchema, rawGuide, guideFile) : null;
  if (guide) {
    if (guide.destinationId !== destination.id)
      issues.push({
        file: guideFile,
        id: guide.id,
        path: "destinationId",
        message: `Expected ${destination.id}`,
      });
    if (allRecordIds.has(guide.id))
      issues.push({
        file: guideFile,
        id: guide.id,
        path: "id",
        message: `Duplicate stable ID also found in ${allRecordIds.get(guide.id)}`,
      });
    else allRecordIds.set(guide.id, guideFile);
    for (const sourceId of guide.sourceRefs) {
      if (!sourcesById.has(sourceId))
        issues.push({
          file: guideFile,
          id: guide.id,
          path: "sourceRefs",
          message: `Unknown source reference ${sourceId}`,
        });
      else {
        if (sourcesById.get(sourceId)?.currentUse !== "used")
          issues.push({
            file: guideFile,
            id: guide.id,
            path: "sourceRefs",
            message: `Source ${sourceId} is not permitted for current use`,
          });
        usedSourceIds.add(sourceId);
        sourceReferences.add(sourceId);
      }
    }
    for (const claim of guide.factualClaims)
      for (const sourceId of claim.sourceRefs) {
        if (!sourcesById.has(sourceId))
          issues.push({
            file: guideFile,
            id: guide.id,
            path: "factualClaims.sourceRefs",
            message: `Unknown source reference ${sourceId}`,
          });
        else {
          if (sourcesById.get(sourceId)?.currentUse !== "used")
            issues.push({
              file: guideFile,
              id: guide.id,
              path: "factualClaims.sourceRefs",
              message: `Source ${sourceId} is not permitted for current use`,
            });
          usedSourceIds.add(sourceId);
          sourceReferences.add(sourceId);
        }
      }
    for (const section of [
      guide.bestTimeToVisit,
      guide.transportAdvice,
      guide.localEtiquette,
      guide.safetyGuidance,
      guide.accessibilityNotes,
      guide.budgetGuidance,
    ]) {
      for (const claim of section)
        for (const sourceId of claim.sourceRefs)
          if (!sourcesById.has(sourceId))
            issues.push({
              file: guideFile,
              id: guide.id,
              path: "sourceRefs",
              message: `Unknown source reference ${sourceId}`,
            });
    }
    for (const categoryId of guide.categoryIds)
      if (!taxonomyIds.has(categoryId))
        issues.push({
          file: guideFile,
          id: guide.id,
          path: "categoryIds",
          message: `Unknown taxonomy ID ${categoryId}`,
        });
    if (guide.verificationStatus === "VERIFIED") summary.verified += 1;
    else if (guide.verificationStatus === "NEEDS_REVIEW")
      summary.needsReview += 1;
    else if (guide.verificationStatus === "UNAVAILABLE")
      summary.unavailable += 1;
    dirRecords.push(guide);
  }
  counts.travelGuide =
    guide && guide.verificationStatus !== "UNAVAILABLE" ? 1 : 0;
  for (const record of dirRecords) {
    if (record.provenance?.status === "VERIFIED" && !record.lastVerifiedAt)
      issues.push({
        file: `${directory}/`,
        id: record.id,
        path: "lastVerifiedAt",
        message: "Verified record has no verification date",
      });
    if (record.categoryIds)
      for (const categoryId of record.categoryIds)
        if (!taxonomyIds.has(categoryId))
          issues.push({
            file: `${directory}/`,
            id: record.id,
            path: "categoryIds",
            message: `Unknown taxonomy ID ${categoryId}`,
          });
  }
  recordsByDestination.set(destination.id, {
    destination,
    recordCollections,
    guide,
    counts,
    sourceRefs: [...sourceReferences].sort(),
  });
  for (const [dataset, count] of Object.entries(counts))
    summary.records[dataset] = (summary.records[dataset] ?? 0) + count;
  const manifestPath = `${directory}/manifest.json`;
  const existingManifest = await readJson(manifestPath).catch(() => null);
  if (existingManifest && command !== "manifest") {
    const manifest = parse(
      travelDestinationManifestSchema,
      existingManifest,
      manifestPath,
    );
    if (manifest) {
      if (manifest.destinationId !== destination.id)
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "destinationId",
          message: "Manifest destination mismatch",
        });
      const expected = manifestFor(
        destination.id,
        recordsByDestination.get(destination.id),
        manifest.generatedAt,
      );
      if (
        JSON.stringify(manifest.recordCounts) !==
        JSON.stringify(expected.recordCounts)
      )
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "recordCounts",
          message: "Manifest recordCounts do not match the datasets",
        });
      if (
        JSON.stringify(manifest.sourceRefs) !==
        JSON.stringify(expected.sourceRefs)
      )
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "sourceRefs",
          message: "Manifest sourceRefs do not match referenced datasets",
        });
      if (manifest.coverageStatus !== expected.coverageStatus)
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "coverageStatus",
          message: "Manifest coverageStatus does not match dataset coverage",
        });
      if (manifest.validationStatus !== expected.validationStatus)
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "validationStatus",
          message:
            "Manifest validationStatus does not match validation results",
        });
      if (JSON.stringify(manifest.issues) !== JSON.stringify(expected.issues))
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "issues",
          message: "Manifest issue list is stale",
        });
      const expectedNames = Object.keys(expected.datasets).sort();
      const actualNames = Object.keys(manifest.datasets).sort();
      if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames))
        issues.push({
          file: manifestPath,
          id: destination.id,
          path: "datasets",
          message: "Manifest dataset entries are missing or unexpected",
        });
      for (const dataset of expectedNames) {
        if (
          JSON.stringify(manifest.datasets[dataset]) !==
          JSON.stringify(expected.datasets[dataset])
        )
          issues.push({
            file: manifestPath,
            id: destination.id,
            path: `datasets.${dataset}`,
            message: "Manifest dataset metadata does not match the file",
          });
      }
    }
  } else if (
    command === "validate" ||
    command === "import" ||
    command === "report"
  ) {
    issues.push({
      file: manifestPath,
      id: destination.id,
      path: "",
      message: "Manifest is missing; run npm run travel-data:manifest",
    });
  }
}

for (const source of registry?.sources ?? []) {
  if (source.currentUse === "used" && !usedSourceIds.has(source.id))
    issues.push({
      file: "data/catalogs/source-registry.json",
      id: source.id,
      path: "currentUse",
      message: "Source marked used but not referenced by any data record",
    });
}
for (const dataset of await readdir(path.join(root, "data/destinations"), {
  withFileTypes: true,
})) {
  if (dataset.isDirectory() && !destinationIds.has(dataset.name))
    issues.push({
      file: `data/destinations/${dataset.name}`,
      id: dataset.name,
      path: "",
      message: "Dataset directory has no canonical destination record",
    });
}

function manifestFor(destinationId, data, generatedAt) {
  const directory = `data/destinations/${destinationId}`;
  const freshnessReference = Date.parse(generatedAt);
  const names = ["destination", ...Object.keys(collections), "travelGuide"];
  const datasets = {};
  for (const name of names) {
    const fileName =
      name === "travelGuide"
        ? "travel-guide.json"
        : name === "destination"
          ? "destination.json"
          : `${name}.json`;
    const count = data.counts[name] ?? 0;
    const records =
      name === "destination"
        ? [data.destination]
        : name === "travelGuide"
          ? data.counts.travelGuide
            ? [data.guide]
            : []
          : (data.recordCollections[name] ?? []);
    const linked = records.filter((record) => record.sourceRefs?.length);
    const sourceCoverage =
      count === 0 || linked.length === 0
        ? "none"
        : linked.length === count
          ? "sourced"
          : "partial";
    const dates = records
      .map((record) => record.lastVerifiedAt)
      .filter(Boolean)
      .map((date) => Date.parse(`${date}T00:00:00Z`));
    const freshnessDays = dates.length
      ? Math.max(
          0,
          Math.floor((freshnessReference - Math.min(...dates)) / 86_400_000),
        )
      : null;
    datasets[name] = {
      filePath: `${directory}/${fileName}`,
      recordCount: count,
      sourceCoverage,
      validationStatus: issues.some(
        (issue) =>
          issue.file.startsWith(directory) && issue.file.endsWith(fileName),
      )
        ? "invalid"
        : "valid",
      freshnessDays,
    };
  }
  const validationIssues = issues
    .filter(
      (issue) =>
        issue.file.startsWith(directory) &&
        issue.file !== `${directory}/manifest.json`,
    )
    .map((issue) => `${issue.id ?? ""} ${issue.path}: ${issue.message}`.trim());
  return {
    schemaVersion: "1.0.0",
    destinationId,
    generatedAt,
    datasets,
    recordCounts: data.counts,
    sourceRefs: data.sourceRefs,
    coverageStatus: Object.entries(data.counts).some(
      ([key, count]) => key !== "destination" && count > 0,
    )
      ? "partial"
      : "not_started",
    validationStatus: validationIssues.length ? "invalid" : "valid",
    issues: validationIssues,
    lastSuccessfulImportAt: null,
  };
}

async function writeManifests() {
  const generatedAt = new Date().toISOString();
  for (const [destinationId, data] of recordsByDestination) {
    await writeFile(
      path.join(root, `data/destinations/${destinationId}/manifest.json`),
      `${JSON.stringify(manifestFor(destinationId, data, generatedAt), null, 2)}\n`,
    );
  }
}

async function writeCoverageReport() {
  const lines = [
    "# Travel data coverage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Destinations: **${summary.destinations}**`,
    "",
    "Counts include destination records, entity records, and one guide record when present. Empty arrays mean no records are currently sourced; they do not establish that no businesses, events, or experiences exist.",
    "",
    "| Dataset | Records |",
    "| --- | ---: |",
    ...Object.entries(summary.records).map(
      ([name, count]) => `| ${name} | ${count} |`,
    ),
    `| Verified records | ${summary.verified} |`,
    `| Needs review | ${summary.needsReview} |`,
    `| Unavailable placeholders | ${summary.unavailable} |`,
    `| Duplicate records | ${summary.duplicates.length} |`,
    `| Validation issues | ${issues.length} |`,
    "",
    "## Destination coverage",
    "",
    "| Destination ID | Type | Dest. | Places | Restaurants | Hotels | Experiences | Events | Routes | Guide | Verified | Needs review | Unavailable | Source status | Coverage | Issues |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |",
  ];
  for (const [id, data] of recordsByDestination) {
    const coveredRecords = Object.entries(data.counts)
      .filter(([key]) => key !== "destination")
      .reduce((sum, [, count]) => sum + count, 0);
    const destinationRecords = [
      data.destination,
      ...Object.values(data.recordCollections).flat(),
      ...(data.guide ? [data.guide] : []),
    ];
    const verified = destinationRecords.filter(
      (record) =>
        record.status === "VERIFIED" ||
        record.verificationStatus === "VERIFIED",
    ).length;
    const needsReview = destinationRecords.filter(
      (record) =>
        record.status === "NEEDS_REVIEW" ||
        record.verificationStatus === "NEEDS_REVIEW",
    ).length;
    const unavailable = destinationRecords.filter(
      (record) =>
        record.status === "UNAVAILABLE" ||
        record.verificationStatus === "UNAVAILABLE",
    ).length;
    const status = data.destination.status;
    const destinationIssues = issues.filter(
      (issue) => issue.file.includes(`/destinations/${id}/`) || issue.id === id,
    ).length;
    lines.push(
      `| ${id} | ${data.destination.destinationType} | ${data.counts.destination} | ${data.counts.places} | ${data.counts.restaurants} | ${data.counts.hotels} | ${data.counts.experiences} | ${data.counts.events} | ${data.counts.routes} | ${data.counts.travelGuide} | ${verified} | ${needsReview} | ${unavailable} | ${status} | ${coveredRecords > 0 ? "partial" : "not started"} | ${destinationIssues} |`,
    );
  }
  lines.push(
    "",
    "## Data quality notes",
    "",
    `- Missing dataset files: ${issues.filter((issue) => issue.message === "Required dataset file is missing").length}.`,
    `- Missing source metadata: ${validDestinationCatalog.filter((record) => !record.sourceRefs.length).length} legacy destination records need review; factual and volatile entity collections stay empty unless sourced.`,
    `- Broken source/category/geographic references: ${countReferenceIssues()}.`,
    `- Other validation issues: ${issues.length}.`,
    `- Duplicate records: ${summary.duplicates.length}; duplicate detection covers stable IDs globally and normalized names within each entity dataset.`,
    `- Unverified or unavailable records: ${summary.needsReview + summary.unavailable}.`,
    `- Stale verified records (older than 365 days): ${countStaleRecords()}.`,
    "- Candidate providers in the source registry are not counted as curated sources. See [travel data policy](TRAVEL_DATA.md) for terms and configuration.",
    "",
  );
  const stale = listStaleRecords();
  lines.push(
    "## Stale record IDs",
    "",
    ...(stale.length
      ? stale.map(({ destinationId, id }) => `- ${destinationId}: ${id}`)
      : ["- None"]),
    "",
  );
  await writeFile(
    path.join(root, "docs/TRAVEL_DATA_COVERAGE.md"),
    lines.join("\n"),
  );
}

function countStaleRecords() {
  return listStaleRecords().length;
}

function listStaleRecords() {
  const threshold = Date.now() - 365 * 86_400_000;
  const stale = [];
  for (const data of recordsByDestination.values()) {
    for (const [name, rows] of Object.entries(data.recordCollections)) {
      for (const record of rows)
        if (
          record.lastVerifiedAt &&
          Date.parse(`${record.lastVerifiedAt}T00:00:00Z`) < threshold
        )
          stale.push({
            destinationId: data.destination.id,
            id: record.id,
            name,
          });
    }
    if (
      data.guide?.lastVerifiedAt &&
      Date.parse(`${data.guide.lastVerifiedAt}T00:00:00Z`) < threshold
    )
      stale.push({
        destinationId: data.destination.id,
        id: data.guide.id,
        name: "travelGuide",
      });
  }
  return stale;
}

function countReferenceIssues() {
  const referenceFields = [
    "sourceRefs",
    "categoryIds",
    "parentDestinationId",
    "destinationId",
    "venueRef",
    "locationRef",
    "originDestinationId",
    "destinationDestinationId",
  ];
  return issues.filter((issue) =>
    referenceFields.some((field) => issue.path.includes(field)),
  ).length;
}

if (command === "manifest") {
  await writeManifests();
  await writeCoverageReport();
} else if (command === "report") {
  await writeCoverageReport();
} else if (command === "import") {
  if (issues.length) {
    await writeCoverageReport();
  } else {
    const generatedAt = new Date().toISOString();
    const importPlan = createTravelDataImportPlan([
      { key: "travel:destinations", content: destinationCatalogRaw },
      { key: "travel:taxonomy", content: taxonomyRaw },
      { key: "travel:sources", content: registryRaw },
      ...[...recordsByDestination].flatMap(([id, data]) => [
        { key: `travel:${id}:destination`, content: data.destination },
        ...Object.entries(data.recordCollections).map(([type, records]) => ({
          key: `travel:${id}:${type}`,
          content: records,
        })),
        { key: `travel:${id}:travel-guide`, content: data.guide },
        {
          key: `travel:${id}:manifest`,
          content: manifestFor(id, data, generatedAt),
        },
      ]),
    ]);
    if (apply) {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URL is required with --apply");
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      try {
        await client.query("BEGIN");
        await applyTravelDataImportPlan(
          (sql, values) => client.query(sql, values),
          importPlan,
        );
        await client.query("COMMIT");
        console.log(
          `Applied ${importPlan.length} datasets with transactional upserts.`,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        await client.end();
      }
    } else {
      console.log(
        `Dry run only: ${importPlan.length} datasets validated; no database writes performed. Add --apply to upsert into site_datasets.`,
      );
    }
  }
} else if (command !== "validate") {
  console.error(
    `Unknown command: ${command}. Use validate, manifest, report, or import.`,
  );
  process.exitCode = 2;
}

await mkdir(path.join(root, "data/manifests/generated"), { recursive: true });
await writeFile(
  path.join(root, "data/manifests/generated/travel-data-report.json"),
  `${JSON.stringify({ ...summary, finishedAt: new Date().toISOString() }, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      destinations: summary.destinations,
      records: summary.records,
      verified: summary.verified,
      needsReview: summary.needsReview,
      unavailable: summary.unavailable,
      duplicateCount: summary.duplicates.length,
      issueCount: issues.length,
      applied: command === "import" && apply,
    },
    null,
    2,
  ),
);
if (issues.length) process.exitCode = 1;
