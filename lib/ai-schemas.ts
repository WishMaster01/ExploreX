import { z } from "zod";

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
  duration: boundedText,
  origin: boundedText,
  budget: boundedText,
  group_size: boundedText,
  hotels: z.array(tripHotelSchema).max(20),
  itinerary: z.array(z.object({
    day: z.coerce.number().int().min(1).max(365),
    day_plan: boundedText,
    best_time_to_visit_day: optionalText,
    activities: z.array(tripActivitySchema).max(30),
  })).max(365),
  optimization: z.object({
    route_distance_km: z.number().min(0),
    distance_saved_km: z.number().min(0),
    budget_activity_cost: z.number().min(0),
    budget_activity_names: z.array(z.string()),
  }).optional(),
});

export const finalResponseSchema = z.object({ trip_plan: tripInfoSchema });
export type ValidTripInfo = z.infer<typeof tripInfoSchema>;
