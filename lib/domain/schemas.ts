import { z } from "zod";
import {
  aiFeatureRequestSchema,
  chatHistorySchema,
  tripInfoSchema,
} from "../ai-schemas";

export const tripPreferenceSchema = z
  .object({
    origin: z.string().trim().min(1).max(160),
    destination: z.string().trim().min(1).max(160),
    group_size: z.string().trim().min(1).max(80),
    budget: z.string().trim().min(1).max(80),
    duration: z.string().trim().min(1).max(80),
    interests: z.array(z.string().trim().max(80)).max(30).optional(),
    requirements: z.array(z.string().trim().max(300)).max(30).optional(),
    currency_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    travel_style: z.string().trim().max(80).optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    accommodation: z.string().trim().max(160).optional(),
    food_preferences: z.string().trim().max(160).optional(),
    transport_preferences: z.string().trim().max(160).optional(),
    walking_tolerance: z.enum(["low", "moderate", "high"]).optional(),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      value.end_date >= value.start_date,
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    },
  )
  .refine((value) => Boolean(value.start_date) === Boolean(value.end_date), {
    message: "Provide both trip dates or leave both flexible",
    path: ["end_date"],
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
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .default("UTC")
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, "A valid IANA time zone is required"),
});

export const reminderUpdateSchema = z.object({
  id: z.string().trim().min(1).max(100),
  status: z.enum(["cancelled", "completed"]),
});

export const tripListQuerySchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d{1,3}$/)
      .optional(),
    cursor: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(["recent", "destination", "budget", "duration"]).optional(),
    favorite: z.enum(["true", "false"]).optional(),
    similarTo: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const tripPatchSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    isFavorite: z.boolean().optional(),
    viewed: z.boolean().optional(),
  })
  .refine((value) => value.isFavorite !== undefined || value.viewed === true);

export function parseTripListQuery(params: URLSearchParams) {
  const allowed = new Set([
    "limit",
    "cursor",
    "search",
    "sort",
    "favorite",
    "similarTo",
  ]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) return null;
  }
  const parsed = tripListQuerySchema.safeParse(
    Object.fromEntries(params.entries()),
  );
  if (!parsed.success) return null;
  const rawLimit = parsed.data.limit;
  const limit = rawLimit === undefined ? undefined : Number(rawLimit);
  if (limit !== undefined && (limit < 1 || limit > 30)) return null;
  return {
    ...parsed.data,
    limit,
    sort: parsed.data.sort ?? "recent",
    favorite: parsed.data.favorite === "true",
  };
}

export const destinationSearchQuerySchema = z
  .object({
    q: z.string().trim().max(80),
    limit: z
      .string()
      .regex(/^\d{1,2}$/)
      .optional(),
  })
  .strict();

export function parseDestinationSearchQuery(params: URLSearchParams) {
  if ([...params.keys()].some((key) => !["q", "limit"].includes(key)))
    return null;
  if (["q", "limit"].some((key) => params.getAll(key).length > 1)) return null;
  const parsed = destinationSearchQuerySchema.safeParse({
    q: params.get("q") ?? "",
    ...(params.has("limit") ? { limit: params.get("limit") } : {}),
  });
  if (!parsed.success) return null;
  const limit =
    parsed.data.limit === undefined ? undefined : Number(parsed.data.limit);
  if (limit !== undefined && (limit < 1 || limit > 12)) return null;
  return { q: parsed.data.q, limit };
}

export const tripDeleteQuerySchema = z
  .object({ id: z.string().trim().min(1).max(100) })
  .strict();

export const userDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  subscription: z.string(),
});

export type AiFeatureRequest = z.infer<typeof aiFeatureRequestSchema>;

export { aiFeatureRequestSchema, chatHistorySchema };
