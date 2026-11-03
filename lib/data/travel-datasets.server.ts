import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { serverLogger } from "@/lib/observability/server-logger";
import {
  travelDestinationCatalogSchema,
  travelDestinationManifestSchema,
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
} from "@/lib/domain/travel-data-schemas";
import destinationCatalogRaw from "../../data/catalogs/destinations.json";
import taxonomyRaw from "../../data/catalogs/travel-taxonomy.json";
import sourceRegistryRaw from "../../data/catalogs/source-registry.json";

const datasetSchemas = {
  places: travelPlaceSchema,
  restaurants: travelRestaurantSchema,
  hotels: travelHotelSchema,
  experiences: travelExperienceSchema,
  events: travelEventSchema,
  routes: travelRouteSchema,
} as const;

async function readLocalJson(
  destinationId: string,
  fileName: string,
): Promise<unknown> {
  const file = path.join(
    process.cwd(),
    "data",
    "destinations",
    destinationId,
    fileName,
  );
  return JSON.parse(await readFile(file, "utf8"));
}

function validateDataset(
  destinationId: string,
  values: Record<string, unknown>,
) {
  const destination = travelDestinationSchema.parse(values.destination);
  if (destination.id !== destinationId)
    throw new Error("Destination record identity mismatch");
  const taxonomy = travelTaxonomySchema.parse(values.taxonomy);
  const sources = travelSourceRegistrySchema.parse(values.sources);
  const manifest = travelDestinationManifestSchema.parse(values.manifest);
  if (manifest.destinationId !== destinationId)
    throw new Error("Manifest destination identity mismatch");
  const knownTaxonomy = new Set([
    ...taxonomy.categories.flatMap((category) => [
      category.id,
      ...category.subcategories.map((subcategory) => subcategory.id),
    ]),
    ...taxonomy.tags.map((tag) => tag.id),
  ]);
  const knownSources = new Set(sources.sources.map((source) => source.id));
  const sourceById = new Map(
    sources.sources.map((source) => [source.id, source]),
  );
  const knownDestinationIds = new Set(
    travelDestinationCatalogSchema
      .parse(destinationCatalogRaw)
      .destinations.map(({ id }) => id),
  );
  const records: Record<string, Array<{ sourceRefs: string[] }>> = {};
  for (const [name, schema] of Object.entries(datasetSchemas)) {
    const parsed = schema.array().parse(values[name]);
    for (const record of parsed) {
      if ("destinationId" in record && record.destinationId !== destinationId)
        throw new Error(`${name} record destination mismatch`);
      if (
        "categoryIds" in record &&
        record.categoryIds.some((categoryId) => !knownTaxonomy.has(categoryId))
      )
        throw new Error(`${name} record has an unknown category`);
      if (record.sourceRefs.some((sourceId) => !knownSources.has(sourceId)))
        throw new Error(`${name} record has an unknown source`);
      if (
        record.sourceRefs.some(
          (sourceId) => sourceById.get(sourceId)?.currentUse !== "used",
        )
      )
        throw new Error(
          `${name} record cites a source not approved for curated storage`,
        );
      if (
        "originDestinationId" in record &&
        !knownDestinationIds.has(record.originDestinationId)
      )
        throw new Error(`${name} record has an unknown route origin`);
      if (
        "destinationDestinationId" in record &&
        !knownDestinationIds.has(record.destinationDestinationId)
      )
        throw new Error(`${name} record has an unknown route destination`);
    }
    records[name] = parsed;
  }
  const guide = travelGuideSchema.parse(values.travelGuide);
  if (
    guide.destinationId !== destinationId ||
    guide.categoryIds.some((categoryId) => !knownTaxonomy.has(categoryId))
  )
    throw new Error("Travel guide validation failed");
  if (guide.sourceRefs.some((sourceId) => !knownSources.has(sourceId)))
    throw new Error("Travel guide references an unknown source");
  for (const claim of guide.factualClaims)
    if (claim.sourceRefs.some((sourceId) => !knownSources.has(sourceId)))
      throw new Error("Travel guide claim references an unknown source");
  const recordCounts = {
    destination: 1,
    ...Object.fromEntries(
      Object.entries(records).map(([name, value]) => [name, value.length]),
    ),
    // Manifests count stored guide objects, including explicit unavailable
    // placeholders. Availability is represented by the guide status itself.
    travelGuide: 1,
  };
  if (JSON.stringify(manifest.recordCounts) !== JSON.stringify(recordCounts))
    throw new Error("Manifest record counts do not match loaded datasets");
  const referencedSources = new Set([
    ...destination.sourceRefs,
    ...Object.values(records).flatMap((value) =>
      value.flatMap((record) => record.sourceRefs),
    ),
    ...guide.sourceRefs,
    ...guide.factualClaims.flatMap((claim) => claim.sourceRefs),
  ]);
  if (
    JSON.stringify(manifest.sourceRefs) !==
    JSON.stringify([...referencedSources].sort())
  )
    throw new Error("Manifest source references do not match loaded datasets");
  return {
    catalog: { destination, ...records, travelGuide: guide },
    taxonomy,
    sources,
    manifest,
  };
}

export async function loadTravelDataset(destinationId: string) {
  const catalogResult = travelDestinationCatalogSchema.safeParse(
    destinationCatalogRaw,
  );
  const knownDestination =
    catalogResult.success &&
    catalogResult.data.destinations.find(({ id }) => id === destinationId);
  if (!knownDestination) return null;

  try {
    const { prisma } = await import("@/lib/db");
    const keys = [
      `travel:${destinationId}:destination`,
      ...Object.keys(datasetSchemas).map(
        (name) => `travel:${destinationId}:${name}`,
      ),
      `travel:${destinationId}:travel-guide`,
      `travel:${destinationId}:manifest`,
      "travel:taxonomy",
      "travel:sources",
    ];
    const rows = await prisma.siteDataset.findMany({
      where: { key: { in: keys } },
      select: { key: true, content: true },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.content]));
    const values: Record<string, unknown> = {
      destination: byKey.get(`travel:${destinationId}:destination`),
      taxonomy: byKey.get("travel:taxonomy"),
      sources: byKey.get("travel:sources"),
      manifest: byKey.get(`travel:${destinationId}:manifest`),
      travelGuide: byKey.get(`travel:${destinationId}:travel-guide`),
    };
    for (const name of Object.keys(datasetSchemas))
      values[name] = byKey.get(`travel:${destinationId}:${name}`);
    if (Object.values(values).every((value) => value !== undefined)) {
      return {
        ...validateDataset(destinationId, values),
        source: "database" as const,
      };
    }
  } catch {
    // Checked-in datasets remain available while PostgreSQL is unavailable or unseeded.
  }

  try {
    const values: Record<string, unknown> = {
      destination: await readLocalJson(destinationId, "destination.json"),
      taxonomy: taxonomyRaw,
      sources: sourceRegistryRaw,
      manifest: await readLocalJson(destinationId, "manifest.json"),
      travelGuide: await readLocalJson(destinationId, "travel-guide.json"),
    };
    for (const name of Object.keys(datasetSchemas))
      values[name] = await readLocalJson(destinationId, `${name}.json`);
    return {
      ...validateDataset(destinationId, values),
      source: "checked_in" as const,
    };
  } catch (error) {
    serverLogger.error("travel_catalog.dataset_invalid", {
      destinationId,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw new Error("Travel dataset is unavailable");
  }
}
