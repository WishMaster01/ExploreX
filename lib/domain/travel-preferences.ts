import { z } from "zod";

export const travelPreferencesSchema = z.object({
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("INR"),
  style: z
    .enum(["balanced", "budget", "slow travel", "luxury", "adventure"])
    .default("balanced"),
  interests: z.string().max(300).default(""),
  accommodation: z.string().max(180).default(""),
  food: z.string().max(180).default(""),
  transport: z.string().max(180).default(""),
  walking: z.enum(["low", "moderate", "high"]).default("moderate"),
});

export type TravelPreferences = z.infer<typeof travelPreferencesSchema>;
export const TRAVEL_PREFERENCES_KEY = "explorex.travel-preferences.v1";
