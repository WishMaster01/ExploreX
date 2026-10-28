import { z } from "zod";
import {
  destinationSchema,
  discoverySchema,
  experienceSchema,
  hotelSchema,
  restaurantSchema,
  travelGuideSchema,
} from "./travel.ts";

const idSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  });
const categoryIdsSchema = z
  .array(idSchema)
  .min(1)
  .max(30)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Category ids must be unique",
  );
const evidenceSchema = z
  .object({
    url: httpsUrlSchema,
    attribution: z.string().trim().min(3).max(300),
    permittedUse: z.string().trim().min(3).max(500),
  })
  .strict();
export const datasetManifestSchema = z
  .object({
    datasetId: idSchema,
    destinationId: idSchema,
    version: z.string().trim().min(1).max(40),
    lastCheckedAt: z.string().date(),
    recordCounts: z
      .object({
        destinations: z.number().int().nonnegative(),
        places: z.number().int().nonnegative(),
        restaurants: z.number().int().nonnegative(),
        hotels: z.number().int().nonnegative(),
        experiences: z.number().int().nonnegative(),
        travelGuides: z.number().int().nonnegative(),
      })
      .strict(),
    coverageNote: z.string().trim().min(3).max(1_000),
    sources: z
      .array(
        z
          .object({
            url: httpsUrlSchema,
            owner: z.string().trim().min(2).max(200),
            attribution: z.string().trim().min(3).max(300),
            licenseOrPolicy: z.string().trim().min(3).max(1_000),
            storagePolicy: z.string().trim().min(3).max(1_000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
const datasetFields = {
  categories: categoryIdsSchema,
  categorySource: z
    .object({
      status: z.literal("CURATED"),
      provider: z.literal("ExploreX taxonomy"),
      retrievedAt: z.null(),
      note: z.string().trim().min(3).max(500),
    })
    .strict(),
  evidence: z.array(evidenceSchema).min(1).max(10),
  verificationStatus: z.enum([
    "VERIFIED",
    "PROVIDER_SOURCED",
    "COMMUNITY_SUBMITTED",
    "ESTIMATED",
    "AI_GENERATED",
    "STALE",
    "UNAVAILABLE",
    "REJECTED",
    "CURATED",
  ]),
  lastCheckedAt: z.string().date(),
};

function withConsistentProvenance<
  T extends { source: { status: string }; verificationStatus: string },
>(schema: z.ZodType<T>) {
  return schema.superRefine((record, context) => {
    if (record.source.status !== record.verificationStatus) {
      context.addIssue({
        code: "custom",
        path: ["verificationStatus"],
        message:
          "verificationStatus must match the provenance status for the record's factual source",
      });
    }
  });
}

export const datasetDestinationSchema = withConsistentProvenance(
  destinationSchema
    .extend({
      ...datasetFields,
      id: idSchema,
      stateCode: z.string().regex(/^[A-Z]{2}$/),
      aliases: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    })
    .strict()
    .superRefine((destination, context) => {
      if (destination.timeZone) {
        try {
          new Intl.DateTimeFormat("en", { timeZone: destination.timeZone });
        } catch {
          context.addIssue({
            code: "custom",
            path: ["timeZone"],
            message: "Destination timezone must be an IANA timezone",
          });
        }
      }
    }),
);

export const datasetPlaceSchema = withConsistentProvenance(
  experienceSchema
    .extend({
      ...datasetFields,
      id: idSchema,
      stateCode: z.string().regex(/^[A-Z]{2}$/),
    })
    .strict(),
);

export const datasetRestaurantSchema = withConsistentProvenance(
  restaurantSchema
    .extend({
      ...datasetFields,
      id: idSchema,
      stateCode: z.string().regex(/^[A-Z]{2}$/),
    })
    .strict(),
);

export const datasetHotelSchema = withConsistentProvenance(
  hotelSchema
    .extend({
      ...datasetFields,
      id: idSchema,
      stateCode: z.string().regex(/^[A-Z]{2}$/),
    })
    .strict(),
);

export const datasetExperienceSchema = datasetPlaceSchema;

export const datasetGuideSchema = withConsistentProvenance(
  travelGuideSchema
    .extend({
      ...datasetFields,
      id: idSchema,
    })
    .strict(),
);

export const taxonomyCategorySchema = z
  .object({
    id: idSchema,
    label: z.string().trim().min(2).max(120),
    parentId: idSchema.nullable(),
    description: z.string().trim().min(3).max(500),
    aliases: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  })
  .strict();

export const taxonomySchema = z
  .object({
    version: z.string().trim().min(1).max(40),
    categories: z.array(taxonomyCategorySchema).min(1).max(200),
  })
  .strict()
  .superRefine((taxonomy, context) => {
    const ids = new Set<string>();
    taxonomy.categories.forEach((category, index) => {
      if (ids.has(category.id))
        context.addIssue({
          code: "custom",
          path: ["categories", index, "id"],
          message: "Duplicate taxonomy id",
        });
      ids.add(category.id);
    });
    taxonomy.categories.forEach((category, index) => {
      if (category.parentId && !ids.has(category.parentId))
        context.addIssue({
          code: "custom",
          path: ["categories", index, "parentId"],
          message: "Parent category does not exist",
        });
    });
  });

export const jaipurCatalogSchema = z
  .object({
    destination: datasetDestinationSchema,
    places: z.array(datasetPlaceSchema),
    restaurants: z.array(datasetRestaurantSchema),
    hotels: z.array(datasetHotelSchema),
    experiences: z.array(datasetExperienceSchema),
    travelGuide: datasetGuideSchema,
  })
  .strict()
  .superRefine((catalog, context) => {
    const checkDestination = (
      record: { destinationId: string },
      path: (string | number)[],
    ) => {
      if (record.destinationId !== catalog.destination.id)
        context.addIssue({
          code: "custom",
          path: [...path, "destinationId"],
          message: "Record destinationId does not match catalog destination",
        });
    };
    catalog.places.forEach((record, index) =>
      checkDestination(record, ["places", index]),
    );
    catalog.restaurants.forEach((record, index) =>
      checkDestination(record, ["restaurants", index]),
    );
    catalog.hotels.forEach((record, index) =>
      checkDestination(record, ["hotels", index]),
    );
    catalog.experiences.forEach((record, index) =>
      checkDestination(record, ["experiences", index]),
    );
    checkDestination(catalog.travelGuide, ["travelGuide"]);
    const ids = [
      catalog.destination.id,
      ...catalog.places.map((record) => record.id),
      ...catalog.restaurants.map((record) => record.id),
      ...catalog.hotels.map((record) => record.id),
      ...catalog.experiences.map((record) => record.id),
      catalog.travelGuide.id,
    ];
    const seen = new Set<string>();
    ids.forEach((id, index) => {
      if (seen.has(id))
        context.addIssue({
          code: "custom",
          path: ["records", index],
          message: `Duplicate stable id: ${id}`,
        });
      seen.add(id);
    });
  });

export type JaipurCatalog = z.infer<typeof jaipurCatalogSchema>;
export type DatasetManifest = z.infer<typeof datasetManifestSchema>;

export function unmanifestedEvidenceReferences(
  catalog: JaipurCatalog,
  manifest: DatasetManifest,
) {
  const declared = new Set(manifest.sources.map(({ url }) => url));
  const records = [
    ["destination", catalog.destination],
    ...catalog.places.map(
      (record, index) => [`places.${index}`, record] as const,
    ),
    ...catalog.restaurants.map(
      (record, index) => [`restaurants.${index}`, record] as const,
    ),
    ...catalog.hotels.map(
      (record, index) => [`hotels.${index}`, record] as const,
    ),
    ...catalog.experiences.map(
      (record, index) => [`experiences.${index}`, record] as const,
    ),
    ["travelGuide", catalog.travelGuide],
  ] as const;
  return records.flatMap(([path, record]) =>
    record.evidence
      .filter(({ url }) => !declared.has(url))
      .map(({ url }) => `${path}: ${url}`),
  );
}

export function unknownCategoryReferences(
  catalog: JaipurCatalog,
  taxonomy: z.infer<typeof taxonomySchema>,
) {
  const valid = new Set(taxonomy.categories.map(({ id }) => id));
  const references = [
    ["destination", catalog.destination.categories],
    ...catalog.places.map(
      (record, index) => [`places.${index}`, record.categories] as const,
    ),
    ...catalog.restaurants.map(
      (record, index) => [`restaurants.${index}`, record.categories] as const,
    ),
    ...catalog.hotels.map(
      (record, index) => [`hotels.${index}`, record.categories] as const,
    ),
    ...catalog.experiences.map(
      (record, index) => [`experiences.${index}`, record.categories] as const,
    ),
    ["travelGuide", catalog.travelGuide.categories],
  ] as const;
  return references.flatMap(([path, ids]) =>
    ids.filter((id) => !valid.has(id)).map((id) => `${path}: ${id}`),
  );
}
