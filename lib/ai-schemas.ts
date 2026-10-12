import { z } from "zod";
import { aiFeatureKeys } from "./data/ai-features";
import { travelSourceTypes } from "./travel-data/types";

const boundedText = z.string().trim().min(1).max(2_000);
const optionalText = z.string().trim().max(2_000);
const imageUrlSchema = z
  .string()
  .trim()
  .max(2_000)
  .refine((value) => {
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Image URLs must use HTTPS");
const coordinateSchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  })
  .strict();

export const travelSourceMetadataSchema = z
  .object({
    source: z.enum(travelSourceTypes),
    provider: z.string().nullable(),
    retrievedAt: z.string().datetime().nullable(),
    placeId: z.string().optional(),
    mapsUrl: z
      .string()
      .url()
      .refine((value) => {
        try {
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            (url.hostname === "google.com" ||
              url.hostname.endsWith(".google.com"))
          );
        } catch {
          return false;
        }
      })
      .optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const aiGenerationMetadataSchema = z
  .object({
    promptVersion: z.string().min(1).max(80),
    model: z.string().min(1).max(120),
    provider: z.string().min(1).max(80),
    feature: z.string().min(1).max(80),
    requestId: z.string().uuid(),
    latencyMs: z.number().int().nonnegative(),
    promptTokens: z.number().int().nonnegative().nullable(),
    completionTokens: z.number().int().nonnegative().nullable(),
    estimatedCostUsd: z.number().nonnegative().nullable(),
    retryCount: z.number().int().nonnegative(),
    cacheHit: z.boolean(),
    verifiedPlaceCount: z.number().int().nonnegative(),
    travelDataProvider: z.string().min(1).max(80),
  })
  .strict();

export const chatResponseSchema = z
  .object({
    resp: z.string().trim().min(1).max(4_000),
    ui: z.enum(["default", "budget", "groupSize", "tripDuration", "final"]),
  })
  .strict();

export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })
  .strict();

export const chatHistorySchema = z.array(chatMessageSchema).min(1).max(40);

export const aiFeatureRequestSchema = z
  .object({
    feature: z.enum(aiFeatureKeys),
    messages: z.array(chatMessageSchema).min(1).max(16),
  })
  .strict();

export const tripActivitySchema = z
  .object({
    place_name: boundedText,
    place_details: boundedText,
    place_image_url: imageUrlSchema,
    geo_coordinates: coordinateSchema,
    place_address: boundedText,
    ticket_pricing: optionalText,
    estimated_cost: z.coerce.number().min(0).optional(),
    time_travel_each_location: optionalText,
    best_time_to_visit: optionalText,
    opening_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    reservation_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    unavailable_periods: z
      .array(
        z
          .object({
            start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    max_travel_time_minutes: z.number().int().min(0).max(720).optional(),
    estimated_travel_time_minutes: z.number().int().min(0).max(720).optional(),
    travel_time_minutes: z.number().int().min(0).max(720).optional(),
    closing_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    visit_duration_minutes: z.coerce.number().int().min(15).max(720).optional(),
    scheduled_start: z.string().optional(),
    scheduled_end: z.string().optional(),
    distance_from_previous_km: z.number().min(0).optional(),
    travel_estimate_source: z
      .enum([
        "VERIFIED",
        "ESTIMATED",
        "AI_GENERATED",
        "USER_PROVIDED",
        "UNAVAILABLE",
      ])
      .optional(),
    source_metadata: travelSourceMetadataSchema.optional(),
  })
  .strict()
  .superRefine((activity, context) => {
    for (const [index, period] of (
      activity.unavailable_periods ?? []
    ).entries()) {
      if (period.end <= period.start)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unavailable_periods", index],
          message: "Unavailable periods must end after they start",
        });
    }
  });

export const tripHotelSchema = z
  .object({
    hotel_name: boundedText,
    hotel_address: boundedText,
    price_per_night: boundedText,
    hotel_image_url: imageUrlSchema,
    geo_coordinates: coordinateSchema,
    rating: z.coerce.number().min(0).max(5),
    description: boundedText,
    recommendation_score: z.number().min(0).max(1).optional(),
    recommendation_reasons: z.array(z.string().max(300)).max(10).optional(),
    amenities: z.array(z.string().trim().max(80)).max(20).optional(),
    source_metadata: travelSourceMetadataSchema.optional(),
  })
  .strict();

export const tripRestaurantSchema = z
  .object({
    restaurant_name: boundedText,
    cuisine: optionalText.optional(),
    price: optionalText.optional(),
    estimated_cost: z.number().min(0).optional(),
    rating: z.number().min(0).max(5).optional(),
    dietary_tags: z.array(z.string().trim().max(80)).max(20).optional(),
    meal_types: z.array(z.string().trim().max(40)).max(10).optional(),
    opening_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    closing_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    geo_coordinates: coordinateSchema.optional(),
    address: optionalText.optional(),
    note: optionalText.optional(),
    recommendation_score: z.number().min(0).max(1).optional(),
    recommendation_reasons: z.array(z.string().max(300)).max(10).optional(),
    source_metadata: travelSourceMetadataSchema.optional(),
  })
  .strict();

export const tripInfoSchema = z
  .object({
    destination: boundedText,
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    time_zone: z.string().trim().min(1).max(80).optional(),
    currency_code: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    duration: boundedText,
    origin: boundedText,
    budget: boundedText,
    group_size: boundedText,
    travel_style: optionalText.optional(),
    interests: z.array(z.string().trim().max(80)).max(30).optional(),
    cuisine_preferences: z.array(z.string().trim().max(80)).max(20).optional(),
    dietary_preferences: z.array(z.string().trim().max(80)).max(20).optional(),
    preferred_meal_type: z
      .enum(["breakfast", "brunch", "lunch", "dinner"])
      .optional(),
    preferred_time_of_day: z
      .enum(["morning", "afternoon", "evening", "flexible"])
      .optional(),
    activity_intensity: z.enum(["relaxed", "balanced", "packed"]).optional(),
    walking_tolerance: z.enum(["low", "moderate", "high"]).optional(),
    hotels: z.array(tripHotelSchema).max(20),
    restaurants: z.array(tripRestaurantSchema).max(30).optional(),
    itinerary: z
      .array(
        z.object({
          day: z.coerce.number().int().min(1).max(365),
          day_plan: boundedText,
          best_time_to_visit_day: optionalText,
          activities: z.array(tripActivitySchema).max(30),
        }),
      )
      .max(365)
      .superRefine((days, context) => {
        const seen = new Set<number>();
        days.forEach((day, index) => {
          if (day.day !== index + 1) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, "day"],
              message:
                "Itinerary day numbers must follow array order starting at one",
            });
          }
          if (seen.has(day.day)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, "day"],
              message: "Each itinerary day number must be unique",
            });
          }
          seen.add(day.day);
        });
      }),
    optimization: z
      .object({
        route_distance_km: z.number().min(0),
        distance_saved_km: z.number().min(0),
        budget_activity_cost: z.number().min(0),
        budget_activity_names: z.array(z.string()),
        budget_allocation: z
          .object({
            accommodation: z.number().min(0),
            food: z.number().min(0),
            transport: z.number().min(0),
            activities: z.number().min(0),
            emergency: z.number().min(0),
            miscellaneous: z.number().min(0),
          })
          .strict()
          .optional(),
        quality_score: z.number().min(0).max(100).optional(),
        quality_dimensions: z
          .object({
            constraint_satisfaction: z.number().min(0).max(100),
            travel_efficiency: z.number().min(0).max(100),
            budget_fit: z.number().min(0).max(100),
            preference_match: z.number().min(0).max(100),
            schedule_density: z.number().min(0).max(100),
          })
          .strict()
          .optional(),
        decision_reasons: z.array(z.string().max(300)).max(100).optional(),
        distance_source: z
          .enum([
            "STRAIGHT_LINE_ESTIMATE",
            "PROVIDER_ROUTE",
            "MIXED_ESTIMATE",
            "UNAVAILABLE",
          ])
          .optional(),
        source_metadata: travelSourceMetadataSchema.optional(),
      })
      .strict()
      .optional(),
    generation_metadata: aiGenerationMetadataSchema.optional(),
    budget_source_metadata: travelSourceMetadataSchema.optional(),
  })
  .strict()
  .superRefine((trip, context) => {
    if (trip.start_date && trip.end_date && trip.end_date < trip.start_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "Trip end date must not precede its start date",
      });
    }
    if (trip.time_zone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: trip.time_zone });
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["time_zone"],
          message: "Trip time zone must be a valid IANA time zone",
        });
      }
    }
  });

export const finalResponseSchema = z
  .object({ trip_plan: tripInfoSchema })
  .strict();

export const aiFeatureAnswerSchema = z.string().trim().min(1).max(8_000);
