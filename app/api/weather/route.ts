import { apiError, apiOk } from "@/lib/api";
import { APP_CONFIG } from "@/lib/config";
import { DomainError } from "@/lib/domain/errors";
import { parseWeatherQueryParams } from "@/lib/domain/schemas";
import { exploreCities } from "@/lib/data/cities";
import { DESTINATIONS } from "@/lib/data/destinations";
import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { serverLogger } from "@/lib/observability/server-logger";
import { getTravelProviderAdapters } from "@/lib/travel-data/adapters";
import { enforceRateLimit } from "@/lib/rate-limit";

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
  return destination &&
    destination.latitude !== undefined &&
    destination.longitude !== undefined
    ? { latitude: destination.latitude, longitude: destination.longitude }
    : null;
}

async function handleGet(request: Request) {
  const params = parseWeatherQueryParams(new URL(request.url).searchParams);
  if (!params)
    return apiError("Weather query parameters are invalid", 400, "VALIDATION_ERROR");

  const denied = await enforceRateLimit(request, {
    ...APP_CONFIG.rateLimits.weather,
    userId: "weather:public",
    keyByIp: true,
  });
  if (denied) return denied;

  const coordinates = params.city
    ? coordinatesForCity(params.city)
    : { latitude: params.lat!, longitude: params.lon! };
  if (!coordinates)
    return apiError("A known destination is required", 400, "VALIDATION_ERROR");

  const startedAt = performance.now();
  try {
    const result = await getTravelProviderAdapters().weather.getWeather({
      coordinates,
    });
    if (!result.items)
      return apiError("Weather data is unavailable", 502, "SERVICE_UNAVAILABLE");
    const observation = result.items;
    serverLogger.info("travel_data.request.completed", {
      provider: result.source.provider,
      feature: "weather",
      latencyMs: Math.round(performance.now() - startedAt),
      success: true,
    });
    const temperature = Math.round(observation.temperatureCelsius);
    return apiOk({
      success: true,
      temp: `${temperature}°C`,
      condition: decodeWeatherCode(Number(observation.conditionCode)),
      rawTemp: temperature,
      timezone: observation.timeZone,
      observedAt: observation.observedAt,
      source: result.source.provider,
      provenance: observation.source,
    });
  } catch (error) {
    const providerError = error instanceof DomainError ? error : null;
    serverLogger.warn("travel_data.request.failed", {
      provider: "configured_weather_adapter",
      feature: "weather",
      latencyMs: Math.round(performance.now() - startedAt),
      errorCode: providerError?.code ?? "PROVIDER_ERROR",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    if (providerError?.code === "PROVIDER_TIMEOUT")
      return apiError("Weather provider timed out", 504, "PROVIDER_TIMEOUT");
    if (providerError?.code === "RATE_LIMITED")
      return apiError("Weather provider is rate limited", 429, "RATE_LIMITED");
    return apiError("Weather data is unavailable", 502, "SERVICE_UNAVAILABLE");
  }
}

export function GET(request: Request) {
  return withRequestMetrics(request, "GET /api/weather", () =>
    handleGet(request),
  );
}
