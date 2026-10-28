import "server-only";
import { serverLogger } from "@/lib/observability/server-logger";
import {
  datasetManifestSchema,
  jaipurCatalogSchema,
  taxonomySchema,
  unknownCategoryReferences,
} from "@/lib/domain/dataset-schemas";
import { indiaTaxonomy, jaipurCatalog } from "./india-catalog";

export async function loadJaipurCatalog() {
  try {
    const { prisma } = await import("@/lib/db");
    const [catalogRow, taxonomyRow, manifestRow] = await Promise.all([
      prisma.siteDataset.findUnique({
        where: { key: "india:jaipur" },
        select: { content: true },
      }),
      prisma.siteDataset.findUnique({
        where: { key: "india:taxonomy" },
        select: { content: true },
      }),
      prisma.siteDataset.findUnique({
        where: { key: "india:jaipur:manifest" },
        select: { content: true },
      }),
    ]);
    if (catalogRow && taxonomyRow && manifestRow) {
      const catalog = jaipurCatalogSchema.safeParse(catalogRow.content);
      const taxonomy = taxonomySchema.safeParse(taxonomyRow.content);
      const manifest = datasetManifestSchema.safeParse(manifestRow.content);
      if (
        catalog.success &&
        taxonomy.success &&
        manifest.success &&
        unknownCategoryReferences(catalog.data, taxonomy.data).length === 0
      ) {
        return {
          catalog: catalog.data,
          taxonomy: taxonomy.data,
          manifest: manifest.data,
          source: "database" as const,
        };
      }
      serverLogger.warn("india_catalog.database_invalid", {
        dataset: "jaipur",
      });
    }
  } catch {
    // Local checked-in catalog remains available while PostgreSQL is not configured.
  }

  const manifestModule = await import("../../data/manifests/jaipur.json");
  const manifest = datasetManifestSchema.parse(manifestModule.default);
  return {
    catalog: jaipurCatalog,
    taxonomy: indiaTaxonomy,
    manifest,
    source: "checked_in" as const,
  };
}
