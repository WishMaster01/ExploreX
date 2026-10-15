import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { APP_CONFIG } from "@/lib/config";
import { parseWeatherQueryParams } from "@/lib/domain/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { serverLogger } from "@/lib/observability/server-logger";
import { fetchWithTimeout } from "@/lib/travel-data/fetch-with-timeout";
import { exploreCities } from "@/lib/data/cities";
import { DESTINATIONS } from "@/lib/data/destinations";

const weatherResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number().finite(),
    weather_code: z.number().int().min(0).max(99),
  }),
  timezone: z.string().min(1).max(80),
});

function decodeWeatherCode(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Light Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Mild";
}

function coordinatesForCity(cityQuery: string) {
  const normalized = cityQuery.trim().toLocaleLowerCase();
  const city = exploreCities.find(
    (item) =>
      item.name.toLocaleLowerCase() === normalized ||
      item.slug.toLocaleLowerCase() === normalized,
  );
  if (city?.coordinates) {
    const [latitude, longitude] = city.coordinates.split(",").map(Number);
    if (Number.isFinite(latitude) && Number.isFinite(longitude))
      return { latitude, longitude };
  }
  const destination = DESTINATIONS.find(
    (item) =>
      item.city.toLocaleLowerCase() === normalized ||
      item.label.toLocaleLowerCase() === normalized,
  );
  return destination
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : null;
}

async function handleGet(request: Request) {
  const params = parseWeatherQueryParams(new URL(request.url).searchParams);
  if (!params)
    return apiError(
      "Weather query parameters are invalid",
      400,
      "VALIDATION_ERROR",
    );

  const policy = APP_CONFIG.rateLimits.weather;
  const denied = await enforceRateLimit(request, {
    ...policy,
    userId: "weather:public",
    keyByIp: true,
  });
  if (denied) return denied;

  const coordinates = params.city
    ? coordinatesForCity(params.city)
    : { latitude: params.lat!, longitude: params.lon! };
  if (!coordinates)
    return apiError("A known destination is required", 400, "VALIDATION_ERROR");

  const providerUrl = new URL("https://api.open-meteo.com/v1/forecast");
  providerUrl.search = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  }).toString();
  const startedAt = performance.now();
  try {
    const response = await fetchWithTimeout(
      fetch,
      providerUrl,
      { cache: "no-store" },
      APP_CONFIG.travelData.timeoutMs,
    );
    if (!response.ok) {
      serverLogger.warn("travel_data.request.completed", {
        provider: "open_meteo",
        feature: "weather",
        latencyMs: Math.round(performance.now() - startedAt),
        status: response.status,
        success: false,
      });
      return apiError(
        "Weather data is unavailable",
        502,
        "SERVICE_UNAVAILABLE",
      );
    }

    const parsed = weatherResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      serverLogger.warn("travel_data.response.invalid", {
        provider: "open_meteo",
        feature: "weather",
      });
      return apiError(
        "Weather data is unavailable",
        502,
        "SERVICE_UNAVAILABLE",
      );
    }
    serverLogger.info("travel_data.request.completed", {
      provider: "open_meteo",
      feature: "weather",
      latencyMs: Math.round(performance.now() - startedAt),
      status: response.status,
      success: true,
    });
    const temperature = Math.round(parsed.data.current.temperature_2m);
    return apiOk({
      success: true,
      temp: `${temperature}°C`,
      condition: decodeWeatherCode(parsed.data.current.weather_code),
      rawTemp: temperature,
      timezone: parsed.data.timezone,
      source: "Open-Meteo Live API",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    serverLogger.warn("travel_data.request.failed", {
      provider: "open_meteo",
      feature: "weather",
      latencyMs: Math.round(performance.now() - startedAt),
      errorCode: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return timedOut
      ? apiError("Weather provider timed out", 504, "PROVIDER_TIMEOUT")
      : apiError("Weather data is unavailable", 502, "SERVICE_UNAVAILABLE");
  }
}

export function GET(request: Request) {
  return withRequestMetrics(request, "GET /api/weather", () =>
    handleGet(request),
  );
}
