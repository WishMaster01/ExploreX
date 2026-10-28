import { z } from "zod";

const text = z.string().trim().min(1).max(500);

export const provenanceStatusSchema = z.enum([
  "VERIFIED",
  "PROVIDER_SOURCED",
  "COMMUNITY_SUBMITTED",
  "ESTIMATED",
  "AI_GENERATED",
  "STALE",
  "UNAVAILABLE",
  "REJECTED",
]);

export const sourceMetadataSchema = z
  .object({
    status: provenanceStatusSchema,
    provider: z.string().trim().min(1).max(120).nullable(),
    retrievedAt: z.string().datetime({ offset: true }).nullable(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    attribution: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((source, context) => {
    if (
      source.validUntil &&
      source.retrievedAt &&
      source.validUntil < source.retrievedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "Validity cannot end before retrieval",
      });
    }
  });

export const coordinatesSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const moneyEstimateSchema = z
  .object({
    amount: z.number().finite().nonnegative(),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/),
    unit: z.enum([
      "per_person",
      "per_night",
      "per_day",
      "per_trip",
      "per_item",
    ]),
    source: sourceMetadataSchema,
  })
  .strict();

export const destinationSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    name: text,
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    region: z.string().trim().max(160).optional(),
    coordinates: coordinatesSchema.optional(),
    timeZone: z.string().trim().min(1).max(80).optional(),
    source: sourceMetadataSchema,
  })
  .strict();

const placeCoreSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    name: text,
    destinationId: z.string().trim().min(1).max(160),
    address: z.string().trim().max(500).optional(),
    coordinates: coordinatesSchema.optional(),
    imageUrl: z
      .string()
      .url()
      .refine((url) => new URL(url).protocol === "https:")
      .optional(),
    source: sourceMetadataSchema,
  })
  .strict();

export const experienceSchema = placeCoreSchema
  .extend({
    category: text,
    description: z.string().trim().max(2_000).optional(),
    estimatedDurationMinutes: z.number().int().positive().max(1_440).optional(),
    price: moneyEstimateSchema.optional(),
  })
  .strict();

export const restaurantSchema = placeCoreSchema
  .extend({
    cuisine: z.string().trim().max(120).optional(),
    dietaryOptions: z.array(z.string().trim().max(80)).max(40).default([]),
    price: moneyEstimateSchema.optional(),
    rating: z.number().min(0).max(5).optional(),
  })
  .strict();

export const hotelSchema = placeCoreSchema
  .extend({
    pricePerNight: moneyEstimateSchema.optional(),
    rating: z.number().min(0).max(5).optional(),
    amenities: z.array(z.string().trim().max(80)).max(60).default([]),
  })
  .strict();

export const routeLegSchema = z
  .object({
    origin: coordinatesSchema,
    destination: coordinatesSchema,
    distanceMeters: z.number().finite().nonnegative().optional(),
    durationSeconds: z.number().finite().nonnegative().optional(),
    mode: z.enum(["walk", "drive", "transit", "rail", "flight", "other"]),
    source: sourceMetadataSchema,
  })
  .strict();

export const weatherObservationSchema = z
  .object({
    coordinates: coordinatesSchema,
    observedAt: z.string().datetime({ offset: true }),
    timeZone: z.string().trim().min(1).max(80),
    temperatureCelsius: z.number().finite(),
    conditionCode: z.string().trim().min(1).max(40),
    source: sourceMetadataSchema,
  })
  .strict();

export const travelGuideSchema = z
  .object({
    destinationId: z.string().trim().min(1).max(160),
    title: text,
    summary: z.string().trim().max(4_000),
    languageCode: z.string().trim().min(2).max(20),
    updatedAt: z.string().datetime({ offset: true }).nullable(),
    source: sourceMetadataSchema,
  })
  .strict();

export const discoverySchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    destinationId: z.string().trim().min(1).max(160),
    title: text,
    description: z.string().trim().max(2_000).optional(),
    category: z.enum(["experience", "restaurant", "hotel", "event", "guide"]),
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
    source: sourceMetadataSchema,
  })
  .strict()
  .superRefine((item, context) => {
    if (item.startsAt && item.endsAt && item.endsAt < item.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Discovery end must not precede its start",
      });
    }
  });

export const itineraryActivitySchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    dayNumber: z.number().int().min(1).max(365),
    position: z.number().int().min(0).max(100),
    experience: experienceSchema,
    scheduledStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    scheduledEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    routeFromPrevious: routeLegSchema.optional(),
    source: sourceMetadataSchema,
  })
  .strict();

export type ProvenanceStatus = z.infer<typeof provenanceStatusSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type MoneyEstimate = z.infer<typeof moneyEstimateSchema>;
export type Destination = z.infer<typeof destinationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type Hotel = z.infer<typeof hotelSchema>;
export type RouteLeg = z.infer<typeof routeLegSchema>;
export type WeatherObservation = z.infer<typeof weatherObservationSchema>;
export type TravelGuide = z.infer<typeof travelGuideSchema>;
export type Discovery = z.infer<typeof discoverySchema>;
export type ItineraryActivity = z.infer<typeof itineraryActivitySchema>;
