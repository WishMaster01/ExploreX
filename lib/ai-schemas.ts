import { z } from "zod";
import { aiFeatureKeys } from "./data/ai-features";

const boundedText = z.string().trim().min(1).max(2_000);
const optionalText = z.string().trim().max(2_000);
const coordinateSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export const chatResponseSchema = z.object({
  resp: z.string().trim().min(1).max(4_000),
  ui: z.enum(["default", "budget", "groupSize", "tripDuration", "final"]),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

export const chatHistorySchema = z.array(chatMessageSchema).min(1).max(40);

export const aiFeatureRequestSchema = z.object({
  feature: z.enum(aiFeatureKeys),
  messages: z.array(chatMessageSchema).min(1).max(16),
});

export const tripActivitySchema = z.object({
  place_name: boundedText,
  place_details: boundedText,
  place_image_url: optionalText,
  geo_coordinates: coordinateSchema,
  place_address: boundedText,
  ticket_pricing: optionalText,
  estimated_cost: z.coerce.number().min(0).optional(),
  time_travel_each_location: optionalText,
  best_time_to_visit: optionalText,
  opening_time: z.string().trim().max(30).optional(),
  closing_time: z.string().trim().max(30).optional(),
  visit_duration_minutes: z.coerce.number().int().min(15).max(720).optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  distance_from_previous_km: z.number().min(0).optional(),
});

export const tripHotelSchema = z.object({
  hotel_name: boundedText,
  hotel_address: boundedText,
  price_per_night: boundedText,
  hotel_image_url: optionalText,
  geo_coordinates: coordinateSchema,
  rating: z.coerce.number().min(0).max(5),
  description: boundedText,
  recommendation_score: z.number().min(0).max(1).optional(),
});

export const tripInfoSchema = z.object({
  destination: boundedText,
  currency_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  duration: boundedText,
  origin: boundedText,
  budget: boundedText,
  group_size: boundedText,
  hotels: z.array(tripHotelSchema).max(20),
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
    })
    .optional(),
});

export const finalResponseSchema = z.object({ trip_plan: tripInfoSchema });
