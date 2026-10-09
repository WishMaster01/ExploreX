import { z } from "zod";
import {
  aiFeatureRequestSchema,
  chatHistorySchema,
  tripInfoSchema,
} from "../ai-schemas";

export const tripPreferenceSchema = z.object({
  origin: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  group_size: z.string().trim().min(1).max(80),
  budget: z.string().trim().min(1).max(80),
  duration: z.string().trim().min(1).max(80),
  interests: z.array(z.string().trim().max(80)).max(30).optional(),
  requirements: z.array(z.string().trim().max(300)).max(30).optional(),
});

export type TripPreference = z.infer<typeof tripPreferenceSchema>;

export const reminderTypeSchema = z.enum(["trip", "packing", "booking"]);

export const reminderStatusSchema = z.enum([
  "scheduled",
  "cancelled",
  "completed",
]);

export const savedTripSchema = tripInfoSchema;

export type ValidTripInfo = z.infer<typeof savedTripSchema>;

export const reminderCreateSchema = z.object({
  tripId: z.string().trim().min(1).max(100),
  type: reminderTypeSchema.default("trip"),
  message: z.string().trim().min(1).max(300),
  remindAt: z.string().datetime({ offset: true }),
});

export const reminderUpdateSchema = z.object({
  id: z.string().trim().min(1).max(100),
  status: z.enum(["cancelled", "completed"]),
});

export const userDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  subscription: z.string(),
});

export type AiFeatureRequest = z.infer<typeof aiFeatureRequestSchema>;

export { aiFeatureRequestSchema, chatHistorySchema };
