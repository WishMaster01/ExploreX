import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  OPEN_METEO_API_KEY: z.string().min(1).optional(),
  TRAVEL_ADAPTER_MODE: z.enum(["auto", "mock", "disabled"]).default("auto"),
  TRAVEL_PLACES_PROVIDER: z
    .enum(["auto", "google_places", "disabled"])
    .default("auto"),
  TRAVEL_GEOCODING_PROVIDER: z
    .enum(["auto", "google_geocoding", "disabled"])
    .default("auto"),
  TRAVEL_ROUTING_PROVIDER: z
    .enum(["auto", "google_routes", "disabled"])
    .default("auto"),
  TRAVEL_WEATHER_PROVIDER: z
    .enum(["auto", "open_meteo", "disabled"])
    .default("auto"),
  TRAVEL_CURRENCY_PROVIDER: z
    .enum(["auto", "frankfurter", "disabled"])
    .default("auto"),
  TRAVEL_DATA_PROVIDER: z
    .enum(["auto", "disabled", "fixture", "google_places"])
    .default("auto"),
  ARCJET_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  ADMIN_USERS: z.string().optional(),
  OPENROUTER_INPUT_COST_PER_MILLION: z.coerce
    .number()
    .finite()
    .nonnegative()
    .optional(),
  OPENROUTER_OUTPUT_COST_PER_MILLION: z.coerce
    .number()
    .finite()
    .nonnegative()
    .optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let parsedEnvironment: ServerEnvironment | undefined;

/** Parse optional server configuration once; feature modules enforce required keys. */
export function getServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  if (source === process.env && parsedEnvironment) return parsedEnvironment;

  const parsed = serverEnvironmentSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean);
    throw new Error(
      `Invalid server environment configuration${fields.length ? `: ${fields.join(", ")}` : ""}`,
    );
  }

  if (source === process.env) parsedEnvironment = parsed.data;
  return parsed.data;
}
