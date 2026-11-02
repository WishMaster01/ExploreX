import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const coordinate = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:");
const sourceStatus = z.enum([
  "VERIFIED",
  "ESTIMATED",
  "USER_PROVIDED",
  "AI_GENERATED",
  "NEEDS_REVIEW",
  "UNAVAILABLE",
]);

export const travelProvenanceSchema = z
  .object({
    status: sourceStatus,
    provider: z.string().trim().min(1).max(200).nullable(),
    providerRecordId: z.string().trim().min(1).max(300).nullable(),
    sourceUrl: httpsUrl.nullable(),
    license: z.string().trim().min(1).max(500).nullable(),
    attribution: z.string().trim().min(1).max(500).nullable(),
    fetchedAt: z.string().datetime({ offset: true }).nullable(),
    lastVerifiedAt: z.string().date().nullable(),
    verificationNotes: z.array(z.string().trim().min(2).max(500)).max(30),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "VERIFIED" &&
      !value.sourceUrl &&
      !value.providerRecordId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceUrl"],
        message:
          "Verified facts require an identifiable source URL or provider record ID",
      });
    }
  });

export const travelTaxonomySchema = z
  .object({
    version: z.string().trim().min(1).max(40),
    categories: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9_]*$/),
            name: z.string().trim().min(2).max(120),
            description: z.string().trim().min(3).max(500),
            subcategories: z.array(
              z
                .object({ id: slug, name: z.string().trim().min(2).max(120) })
                .strict(),
            ),
            tags: z.array(slug),
          })
          .strict(),
      )
      .length(16),
    tags: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z][a-z0-9_]*$/),
          name: z.string().trim().min(2).max(120),
          description: z.string().trim().min(3).max(500),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set();
    const required = [
      "spiritual",
      "mountains",
      "beaches",
      "heritage",
      "culture",
      "wildlife",
      "adventure",
      "food",
      "hidden_gems",
      "weekend",
      "water",
      "desert",
      "ecotourism",
      "romantic_family",
      "budget_backpacking",
      "wellness",
    ];
    for (const requiredId of required)
      if (!value.categories.some((category) => category.id === requiredId))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories"],
          message: `Missing required category ${requiredId}`,
        });
    for (const requiredId of ["photography", "village_tourism", "workation"])
      if (!value.tags.some((tag) => tag.id === requiredId))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags"],
          message: `Missing required taxonomy tag ${requiredId}`,
        });
    value.categories.forEach((category, index) => {
      if (ids.has(category.id))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories", index, "id"],
          message: `Duplicate category ${category.id}`,
        });
      ids.add(category.id);
      category.subcategories.forEach((subcategory, subIndex) => {
        if (ids.has(subcategory.id))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["categories", index, "subcategories", subIndex, "id"],
            message: `Duplicate taxonomy id ${subcategory.id}`,
          });
        ids.add(subcategory.id);
      });
    });
    value.tags.forEach((tag, index) => {
      if (ids.has(tag.id))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags", index, "id"],
          message: `Duplicate taxonomy id ${tag.id}`,
        });
      ids.add(tag.id);
    });
  });

export const travelSourceRegistrySchema = z
  .object({
    version: z.string().trim().min(1).max(40),
    sources: z
      .array(
        z
          .object({
            id: slug,
            name: z.string().trim().min(2).max(200),
            url: httpsUrl,
            owner: z.string().trim().min(2).max(200),
            dataTypes: z.array(z.string().trim().min(2).max(100)).min(1),
            licenseStatus: z.enum([
              "terms_unclear",
              "attribution_required",
              "terms_reference",
              "odbl_share_alike",
              "restricted_storage",
              "cc_by_4_noncommercial_free_tier",
              "account_terms_review_required",
              "terms_review_required",
              "dataset_terms_review_required",
            ]),
            license: z.string().trim().min(5).max(1_000),
            termsUrl: httpsUrl.nullable(),
            attribution: z.string().trim().min(2).max(500),
            storagePolicy: z.string().trim().min(5).max(1_000),
            currentUse: z.enum([
              "used",
              "integrated_ephemeral",
              "candidate_not_used",
            ]),
            lastCheckedAt: z.string().date(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    const seen = new Set();
    registry.sources.forEach((source, index) => {
      if (seen.has(source.id))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "id"],
          message: `Duplicate source id ${source.id}`,
        });
      seen.add(source.id);
    });
  });

const sourceRefs = z.array(slug).max(50);
const categories = z.array(z.string().regex(/^[a-z][a-z0-9_-]*$/)).max(50);
const recordBase = {
  id: slug,
  destinationId: slug,
  categoryIds: categories,
  sourceRefs,
  verificationStatus: sourceStatus,
  provenance: travelProvenanceSchema,
  lastVerifiedAt: z.string().date().nullable(),
};

export const travelDestinationSchema = z
  .object({
    id: slug,
    label: z.string().trim().min(2).max(200),
    name: z.string().trim().min(2).max(160),
    destinationType: z.enum([
      "city",
      "region",
      "island",
      "country",
      "state",
      "other",
    ]),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    city: z.string().trim().min(1).max(160).nullable(),
    state: z.string().trim().min(1).max(160).nullable(),
    country: z.string().trim().min(1).max(160),
    parentDestinationId: slug.nullable(),
    aliases: z.array(z.string().trim().min(1).max(160)).max(30),
    coordinates: coordinate.nullable(),
    timeZone: z.string().trim().min(1).max(80).nullable(),
    popularity: z.number().finite().min(0).max(100),
    categoryIds: categories,
    sourceRefs,
    status: sourceStatus,
    lastVerifiedAt: z.string().date().nullable(),
    provenance: travelProvenanceSchema,
  })
  .strict()
  .superRefine((destination, context) => {
    if (destination.status !== destination.provenance.status)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Destination status must match provenance status",
      });
    if (destination.status === "VERIFIED" && !destination.lastVerifiedAt)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastVerifiedAt"],
        message: "Verified destination requires lastVerifiedAt",
      });
    if (destination.timeZone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: destination.timeZone });
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["timeZone"],
          message: "Expected an IANA timezone",
        });
      }
    }
  });

export const travelDestinationCatalogSchema = z
  .object({
    version: z.string().trim().min(1).max(40),
    destinations: z.array(travelDestinationSchema).min(1),
  })
  .strict()
  .superRefine((catalog, context) => {
    const seen = new Set<string>();
    catalog.destinations.forEach((destination, index) => {
      if (seen.has(destination.id))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinations", index, "id"],
          message: `Duplicate destination ID ${destination.id}`,
        });
      seen.add(destination.id);
    });
  });

export const travelPlaceSchema = z
  .object({
    ...recordBase,
    name: z.string().trim().min(2).max(200),
    placeType: z.enum([
      "attraction",
      "landmark",
      "park",
      "museum",
      "religious_site",
      "neighborhood",
      "other",
    ]),
    coordinates: coordinate.optional(),
    address: z.string().trim().min(2).max(500).optional(),
    description: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .superRefine(checkStatus);

export const travelRestaurantSchema = z
  .object({
    ...recordBase,
    name: z.string().trim().min(2).max(200),
    cuisineTags: z.array(slug).max(30),
    coordinates: coordinate.optional(),
    address: z.string().trim().min(2).max(500).optional(),
    dietaryOptions: z.array(z.string().trim().min(2).max(100)).optional(),
    accessibility: z.array(z.string().trim().min(2).max(150)).optional(),
  })
  .strict()
  .superRefine((record, context) => {
    checkStatus(record, context);
    if (
      (record.dietaryOptions?.length || record.accessibility?.length) &&
      record.sourceRefs.length === 0
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceRefs"],
        message: "Dietary and accessibility claims require source references",
      });
  });

export const travelHotelSchema = z
  .object({
    ...recordBase,
    name: z.string().trim().min(2).max(200),
    accommodationType: z.enum([
      "hotel",
      "hostel",
      "guesthouse",
      "homestay",
      "resort",
      "other",
    ]),
    coordinates: coordinate.optional(),
    address: z.string().trim().min(2).max(500).optional(),
    price: z
      .object({
        amount: z.number().nonnegative(),
        currency: z.string().regex(/^[A-Z]{3}$/),
        asOf: z.string().datetime({ offset: true }),
        status: z.enum(["estimate", "quoted"]),
        sourceRefs: z.array(slug).min(1),
      })
      .strict()
      .nullable()
      .optional(),
    availability: z.enum(["unknown", "available", "unavailable"]).optional(),
    bookingUrl: httpsUrl.nullable().optional(),
  })
  .strict()
  .superRefine((record, context) => {
    checkStatus(record, context);
    if (
      record.price &&
      record.price.sourceRefs.some(
        (sourceId) => !record.sourceRefs.includes(sourceId),
      )
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price", "sourceRefs"],
        message: "Price sources must also be cited by the hotel record",
      });
    if (
      record.availability &&
      record.availability !== "unknown" &&
      (record.verificationStatus !== "VERIFIED" || !record.sourceRefs.length)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availability"],
        message: "Known availability requires a verified source",
      });
    if (record.bookingUrl && !record.sourceRefs.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookingUrl"],
        message: "Booking URLs require source references",
      });
  });

export const travelExperienceSchema = z
  .object({
    ...recordBase,
    title: z.string().trim().min(2).max(200),
    activityType: z.string().trim().min(2).max(120),
    locationRef: slug.nullable().optional(),
    durationMinutes: z
      .number()
      .int()
      .positive()
      .max(100_000)
      .nullable()
      .optional(),
    seasonality: z.array(z.string().trim().min(2).max(100)).optional(),
    operator: z.string().trim().min(2).max(200).nullable().optional(),
  })
  .strict()
  .superRefine(checkStatus);

export const travelEventSchema = z
  .object({
    ...recordBase,
    title: z.string().trim().min(2).max(200),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable(),
    timeZone: z.string().trim().min(1).max(80),
    venueRef: slug.nullable(),
    organizer: z.string().trim().min(2).max(200).nullable(),
    eventStatus: z.enum([
      "confirmed",
      "dates_unconfirmed",
      "cancelled",
      "past",
    ]),
  })
  .strict()
  .superRefine((event, context) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: event.timeZone });
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeZone"],
        message: "Expected an IANA timezone",
      });
    }
    checkStatus(event, context);
    if (
      event.startsAt &&
      event.endsAt &&
      Date.parse(event.endsAt) < Date.parse(event.startsAt)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Event end precedes start",
      });
    if (
      event.eventStatus === "confirmed" &&
      (!event.startsAt ||
        !event.endsAt ||
        event.verificationStatus !== "VERIFIED")
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventStatus"],
        message: "Confirmed events require verified start and end dates",
      });
  });

export const travelGuideSchema = z
  .object({
    id: slug,
    destinationId: slug,
    overview: z.string().max(4_000),
    bestTimeToVisit: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(500),
          sourceRefs,
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    factualClaims: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(1_000),
          sourceRefs: z.array(slug).min(1),
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    editorialAdvice: z.array(z.string().trim().min(2).max(1_000)),
    transportAdvice: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(500),
          sourceRefs,
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    localEtiquette: z.array(
      z
        .object({ text: z.string().trim().min(2).max(500), sourceRefs })
        .strict(),
    ),
    safetyGuidance: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(500),
          sourceRefs,
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    accessibilityNotes: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(500),
          sourceRefs,
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    budgetGuidance: z.array(
      z
        .object({
          text: z.string().trim().min(2).max(500),
          sourceRefs,
          freshnessDays: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    categoryIds: categories,
    sourceRefs,
    verificationStatus: sourceStatus,
    provenance: travelProvenanceSchema,
    lastVerifiedAt: z.string().date().nullable(),
  })
  .strict()
  .superRefine(checkStatus);

export const travelRouteSchema = z
  .object({
    id: slug,
    originDestinationId: slug,
    destinationDestinationId: slug,
    provider: z.string().trim().min(1).max(160).nullable(),
    travelMode: z.enum([
      "walk",
      "drive",
      "transit",
      "rail",
      "flight",
      "ferry",
      "other",
    ]),
    durationSeconds: z.number().nonnegative().nullable(),
    distanceMeters: z.number().nonnegative().nullable(),
    measurementType: z.enum(["provider", "straight_line_estimate"]),
    retrievedAt: z.string().datetime({ offset: true }).nullable(),
    sourceRefs,
    attribution: z.string().trim().min(2).max(500).nullable(),
    verificationStatus: sourceStatus,
  })
  .strict()
  .superRefine((route, context) => {
    if (
      route.measurementType === "provider" &&
      (!route.provider || !route.retrievedAt || route.sourceRefs.length === 0)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provider"],
        message:
          "Provider routes require provider, retrieval time and source reference",
      });
    if (
      route.measurementType === "straight_line_estimate" &&
      (route.travelMode !== "other" || route.durationSeconds !== null)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["measurementType"],
        message:
          "Straight-line estimates cannot claim a transport mode or travel duration",
      });
  });

export const travelDestinationManifestSchema = z
  .object({
    schemaVersion: z.string().trim().min(1).max(40),
    destinationId: slug,
    generatedAt: z.string().datetime({ offset: true }),
    datasets: z.record(
      z.string(),
      z
        .object({
          filePath: z.string().startsWith("data/destinations/"),
          recordCount: z.number().int().nonnegative(),
          sourceCoverage: z.enum(["sourced", "partial", "none"]),
          validationStatus: z.enum(["valid", "invalid", "not_checked"]),
          freshnessDays: z.number().int().nonnegative().nullable(),
        })
        .strict(),
    ),
    recordCounts: z.record(z.string(), z.number().int().nonnegative()),
    sourceRefs,
    coverageStatus: z.enum(["not_started", "partial", "good"]),
    validationStatus: z.enum(["valid", "invalid", "not_checked"]),
    issues: z.array(z.string().trim().min(2).max(1_000)),
    lastSuccessfulImportAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

function checkStatus(
  value: {
    verificationStatus: string;
    provenance: { status: string };
    lastVerifiedAt: string | null;
  },
  context: z.RefinementCtx,
) {
  if (value.verificationStatus !== value.provenance.status)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["verificationStatus"],
      message: "Record status must match provenance status",
    });
  if (value.verificationStatus === "VERIFIED" && !value.lastVerifiedAt)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lastVerifiedAt"],
      message: "Verified record requires lastVerifiedAt",
    });
}

export type TravelDestination = z.infer<typeof travelDestinationSchema>;
export type TravelTaxonomy = z.infer<typeof travelTaxonomySchema>;
export type TravelDestinationManifest = z.infer<
  typeof travelDestinationManifestSchema
>;

/** Compatibility projection for the existing flat taxonomy API and persisted Jaipur dataset. */
export function flattenTravelTaxonomy(input: unknown) {
  const taxonomy = travelTaxonomySchema.parse(input);
  const categories = taxonomy.categories.flatMap((category) => [
    {
      id: category.id,
      label: category.name,
      parentId: null,
      description: category.description,
      aliases: category.tags,
    },
    ...category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      label: subcategory.name,
      parentId: category.id,
      description: category.description,
      aliases: [],
    })),
  ]);
  categories.push(
    ...taxonomy.tags.map((tag) => ({
      id: tag.id,
      label: tag.name,
      parentId: null,
      description: tag.description,
      aliases: [],
    })),
  );
  return { version: taxonomy.version, categories };
}
