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
const verificationStatuses = [
  "VERIFIED",
  "NEEDS_REVIEW",
  "ESTIMATED",
  "AI_GENERATED",
  "USER_PROVIDED",
  "UNAVAILABLE",
];
const recordsByDestination = new Map();
const summary = {
  destinations: 0,
  records: {},
  verificationStatuses: Object.fromEntries(
    verificationStatuses.map((status) => [status, 0]),
  ),
  duplicates: [],
  issues,
};

function addStatusCount(record) {
  const status =
    record.status ?? record.verificationStatus ?? record.provenance?.status;
  if (Object.hasOwn(summary.verificationStatuses, status))
    summary.verificationStatuses[status] += 1;
}

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
  addStatusCount(destination);
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
      addStatusCount(record);
      if (record.verificationStatus === "VERIFIED") {
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
    addStatusCount(guide);
    dirRecords.push(guide);
  }
  // Count the object physically stored in travel-guide.json, including an
  // explicit UNAVAILABLE placeholder. Coverage below separately excludes it.
  counts.travelGuide = guide ? 1 : 0;
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
      ([key, count]) =>
        key !== "destination" &&
        count > 0 &&
        !(key === "travelGuide" && data.guide?.verificationStatus === "UNAVAILABLE"),
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
  const statusCell = (rows, status) =>
    rows.filter(
      (record) =>
        (record.status ?? record.verificationStatus ?? record.provenance?.status) ===
        status,
    ).length;
  const recordSourceCount = (rows) =>
    rows.filter((record) => {
      const references = [
        ...(record.sourceRefs ?? []),
        ...(record.factualClaims ?? []).flatMap((claim) => claim.sourceRefs),
      ];
      return references.some((sourceId) => sourcesById.has(sourceId));
    }).length;
  const rightsCoverage = (name, rows) => {
    if (name.startsWith("taxonomy")) return "N/A (editorial taxonomy)";
    if (name === "source registry")
      return `${sourceRows.filter((source) => source.license && source.attribution && source.storagePolicy).length}/${sourceRows.length} complete`;
    if (name === "destination manifests") return "inherited from registry";
    const sourceIds = new Set(
      rows.flatMap((record) => [
        ...(record.sourceRefs ?? []),
        ...(record.factualClaims ?? []).flatMap((claim) => claim.sourceRefs),
      ]),
    );
    if (!sourceIds.size) return "none (no linked sources)";
    const policyComplete = [...sourceIds].filter((sourceId) => {
      const source = sourcesById.get(sourceId);
      return source?.license && source.attribution && source.storagePolicy;
    }).length;
    return `${policyComplete}/${sourceIds.size} linked source policies documented`;
  };
  const destinationRows = validDestinationCatalog;
  const entityRows = Object.fromEntries(
    Object.keys(collections).map((name) => [
      name,
      [...recordsByDestination.values()].flatMap(
        (data) => data.recordCollections[name] ?? [],
      ),
    ]),
  );
  const guideRows = [...recordsByDestination.values()]
    .map((data) => data.guide)
    .filter(Boolean);
  const sourceRows = registry?.sources ?? [];
  const manifestRows = await Promise.all(
    [...recordsByDestination.keys()].map(async (id) =>
      readJson(`data/destinations/${id}/manifest.json`).catch(() => null),
    ),
  );
  const legacyDatasetFiles = [
    ["destinations", "data/destinations/jaipur.json", "destinations"],
    ["places", "data/places/jaipur.json", "places"],
    ["restaurants", "data/restaurants/jaipur.json", "restaurants"],
    ["hotels", "data/hotels/jaipur.json", "hotels"],
    ["experiences", "data/experiences/jaipur.json", "experiences"],
    ["travel guides", "data/travel-guides/jaipur.json", "travelGuides"],
  ];
  const legacyManifest = await readJson("data/manifests/jaipur.json").catch(
    () => null,
  );
  const legacyRows = await Promise.all(
    legacyDatasetFiles.map(async ([name, file, manifestKey]) => {
      const raw = await readJson(file).catch(() => null);
      const rows = raw === null ? [] : Array.isArray(raw) ? raw : [raw];
      const withEvidence = rows.filter(
        (record) =>
          (record.evidence?.length ?? 0) > 0 ||
          record.source?.status === "PROVIDER_SOURCED",
      ).length;
      return {
        name,
        file,
        count: rows.length,
        withEvidence,
        manifestMatches:
          legacyManifest?.recordCounts?.[manifestKey] === rows.length,
      };
    }),
  );
  const reportDatasets = [
    ["destinations", destinationRows, "data/catalogs/destinations.json"],
    ...Object.entries(entityRows).map(([name, rows]) => [
      name,
      rows,
      "data/destinations/",
    ]),
    ["travel guides (including unavailable placeholders)", guideRows, "data/destinations/"],
    ["taxonomy categories", taxonomy?.categories ?? [], "data/catalogs/travel-taxonomy.json"],
    [
      "taxonomy subcategories",
      taxonomy?.categories.flatMap((category) => category.subcategories) ?? [],
      "data/catalogs/travel-taxonomy.json",
    ],
    ["taxonomy tags", taxonomy?.tags ?? [], "data/catalogs/travel-taxonomy.json"],
    ["source registry", sourceRows, "data/catalogs/source-registry.json"],
    ["destination manifests", manifestRows.filter(Boolean), "data/destinations/"],
  ];
  const threshold = Date.now() - 365 * 86_400_000;
  const lines = [
    "# Travel data coverage and audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Canonical destinations: **${summary.destinations}**; physical destination folders: **${recordsByDestination.size}**; destination manifests: **${manifestRows.filter(Boolean).length}**.`,
    "",
    "Record counts reflect objects actually stored, including explicit UNAVAILABLE travel-guide placeholders. Taxonomy, source-registry, and manifest rows are metadata and do not have travel verification statuses. A source is counted as identifiable when a record references an ID present in the source registry; this does not itself mean the claim is independently verified or its license permits storage.",
    "",
    "Empty entity datasets are INCOMPLETE, not evidence that no matching businesses or activities exist. An AI-generated description is never counted as evidence of factual accuracy.",
    "",
    "| Dataset | Actual records | Source-identifiable | Rights metadata | VERIFIED | NEEDS_REVIEW | ESTIMATED | AI_GENERATED | USER_PROVIDED | UNAVAILABLE | Missing fields | Invalid coordinates | Duplicate IDs | Broken references | Stale >365d |",
    "| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const [name, rows, filePrefix] of reportDatasets) {
    const related = issues.filter((issue) => issue.file.startsWith(filePrefix));
    const metadataOnly = name.startsWith("taxonomy") || name === "source registry" || name === "destination manifests";
    const missing = related.filter(
      (issue) =>
        /required|undefined/i.test(issue.message) ||
        issue.message === "Required dataset file is missing",
    ).length;
    const invalidCoordinates = related.filter((issue) =>
      issue.path.toLowerCase().includes("coordinate"),
    ).length;
    const duplicateIds = related.filter((issue) =>
      /duplicate stable id|duplicate .* id/i.test(issue.message),
    ).length;
    const brokenRefs = related.filter((issue) =>
      /unknown (source|taxonomy|place|venue|parent|route)/i.test(issue.message),
    ).length;
    const stale = rows.filter((record) => {
      const checkedAt =
        record.lastVerifiedAt ?? record.lastCheckedAt ?? record.generatedAt;
      const timestamp = record.generatedAt
        ? Date.parse(record.generatedAt)
        : checkedAt
          ? Date.parse(`${checkedAt}T00:00:00Z`)
          : Number.NaN;
      return Number.isFinite(timestamp) && timestamp < threshold;
    }).length;
    const statusValues = metadataOnly
      ? verificationStatuses.map(() => "N/A")
      : verificationStatuses.map((status) => statusCell(rows, status));
    const sourceCount = metadataOnly ? "N/A" : recordSourceCount(rows);
    const rights = rightsCoverage(name, rows);
    lines.push(
      `| ${name} | ${rows.length}${rows.length === 0 ? " (INCOMPLETE)" : ""} | ${sourceCount} | ${rights} | ${statusValues.join(" | ")} | ${missing} | ${invalidCoordinates} | ${duplicateIds} | ${brokenRefs} | ${stale} |`,
    );
  }
  lines.push(
    "",
    "",
    "## Per-destination inventory",
    "",
    "| Destination ID | Places | Restaurants | Hotels | Experiences | Events | Routes | Guide file record | Verified | Needs review | Estimated | AI generated | User provided | Unavailable | Manifest count matches files | Coverage | Validation issues |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |",
  );
  for (const [id, data] of recordsByDestination) {
    const destinationRecords = [
      data.destination,
      ...Object.values(data.recordCollections).flat(),
      ...(data.guide ? [data.guide] : []),
    ];
    const destinationStatusCells = verificationStatuses.map((status) =>
      statusCell(destinationRecords, status),
    );
    const guideStatus = data.guide?.verificationStatus ?? "MISSING";
    const physicalCounts = data.counts;
    const manifest = manifestRows[
      [...recordsByDestination.keys()].indexOf(id)
    ];
    const manifestMatches = Boolean(
      manifest &&
        Object.entries(physicalCounts).every(
          ([name, count]) => manifest.recordCounts?.[name] === count,
        ),
    );
    const hasUsefulCoverage =
      Object.values(data.recordCollections).some((rows) => rows.length > 0) ||
      (Boolean(data.guide) && guideStatus !== "UNAVAILABLE");
    const destinationIssues = issues.filter(
      (issue) => issue.file.includes(`/destinations/${id}/`) || issue.id === id,
    ).length;
    lines.push(
      `| ${id} | ${data.counts.places} | ${data.counts.restaurants} | ${data.counts.hotels} | ${data.counts.experiences} | ${data.counts.events} | ${data.counts.routes} | ${data.guide ? 1 : 0} | ${destinationStatusCells.join(" | ")} | ${manifestMatches ? "yes" : "NO"} | ${hasUsefulCoverage ? "partial" : "not started"} | ${destinationIssues} |`,
    );
  }
  lines.push(
    "",
    "## Findings and source policy",
    "",
    `- Verification status totals across travel records: ${verificationStatuses.map((status) => `${status} ${summary.verificationStatuses[status]}`).join(", ")}.`,
    `- Empty datasets: ${Object.entries(entityRows).filter(([, rows]) => rows.length === 0).map(([name]) => name).join(", ")}; these are incomplete inventories.`,
    "## Data quality notes",
    "",
    `- Missing dataset files: ${issues.filter((issue) => issue.message === "Required dataset file is missing").length}.`,
    `- Destination records without an identifiable source reference: ${validDestinationCatalog.filter((record) => !record.sourceRefs.some((sourceId) => sourcesById.has(sourceId))).length}; these legacy coordinates remain NEEDS_REVIEW.`,
    `- Broken source/category/geographic references: ${countReferenceIssues()}.`,
    `- Other validation issues: ${issues.length}.`,
    `- Duplicate records: ${summary.duplicates.length}; duplicate detection covers stable IDs globally and normalized names within each entity dataset.`,
    `- Records that need review or are unavailable: ${summary.verificationStatuses.NEEDS_REVIEW + summary.verificationStatuses.UNAVAILABLE}.`,
    `- Stale verified records (older than 365 days): ${countStaleRecords()}.`,
    `- License, attribution, and storage policy fields are present in ${sourceRows.filter((source) => source.license && source.attribution && source.storagePolicy).length}/${sourceRows.length} source-registry entries. Jaipur city-profile reuse terms remain explicitly unknown; source-specific restrictions and candidate-only status are described in the registry and [travel data policy](TRAVEL_DATA.md).`,
    "- The four canonical Jaipur place records contain sourced names only; guide factualClaims are empty. No AI-generated content is included as evidence. The 40 legacy destination coordinates are preserved for compatibility but remain unsupported pending source review; no record has been invented to fill empty datasets.",
    "- Phase 2 compatibility files under data/{places,restaurants,hotels,experiences,travel-guides}/jaipur.json remain separate from the canonical per-destination set. The legacy places file has four sourced-name records and the legacy guide is an editorial status summary; its PROVIDER_SOURCED/CURATED labels are not the canonical verification vocabulary. The legacy data/manifests/jaipur.json counts match those compatibility files.",
    "- Source URLs were not re-fetched during this local audit. Record lastVerifiedAt is therefore reported as stored, not independently confirmed during this run.",
    "",
    "## Phase 2 Jaipur compatibility files",
    "",
    "These files are retained separately from the canonical `jaipur-in` folder. Their legacy `PROVIDER_SOURCED` and `CURATED` labels do not map directly to canonical verification states. Evidence/source columns count rows with an evidence URL list or provider-sourced marker; use the legacy schema and manifest for details.",
    "",
    "| Dataset | File records | Rows with legacy evidence/source marker | Legacy manifest count matches |",
    "| --- | ---: | ---: | --- |",
    ...legacyRows.map(
      (row) =>
        `| ${row.name} | ${row.count}${row.count === 0 ? " (INCOMPLETE)" : ""} | ${row.withEvidence} | ${row.manifestMatches ? "yes" : "NO"} |`,
    ),
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
    if (
      data.destination.lastVerifiedAt &&
      Date.parse(`${data.destination.lastVerifiedAt}T00:00:00Z`) < threshold
    )
      stale.push({
        destinationId: data.destination.id,
        id: data.destination.id,
        name: "destination",
      });
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
  for (const source of registry?.sources ?? [])
    if (Date.parse(`${source.lastCheckedAt}T00:00:00Z`) < threshold)
      stale.push({
        destinationId: "source-registry",
        id: source.id,
        name: "source",
      });
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
      verificationStatuses: summary.verificationStatuses,
      duplicateCount: summary.duplicates.length,
      issueCount: issues.length,
      applied: command === "import" && apply,
    },
    null,
    2,
  ),
);
if (issues.length) process.exitCode = 1;
