import "server-only";
import { z } from "zod";
import { DomainError } from "@/lib/domain/errors";
import { weatherObservationSchema } from "@/lib/domain/travel";
import type { SourceMetadata, WeatherObservation } from "@/lib/domain/travel";
import type {
  ProviderResult,
  WeatherInput,
  WeatherProvider,
} from "@/lib/travel-data/ports";
import { APP_CONFIG } from "@/lib/config";
import {
  requestProviderJson,
  parseProviderResponse,
  providerTimestamp,
} from "./http";

const responseSchema = z.object({
  current: z.object({
    time: z.number().finite().positive(),
    temperature_2m: z.number().finite(),
    weather_code: z.number().int().min(0).max(99),
  }),
  timezone: z.string().trim().min(1).max(80),
});

export class OpenMeteoWeatherAdapter implements WeatherProvider {
  readonly name = "open_meteo";

  constructor(
    private readonly options: {
      apiKey?: string;
      customerEndpoint?: boolean;
    } = {},
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs: number = APP_CONFIG.travelData.timeoutMs,
  ) {}

  async getWeather(
    input: WeatherInput,
  ): Promise<ProviderResult<WeatherObservation | null>> {
    if (input.at)
      throw new DomainError(
        "VALIDATION_ERROR",
        "Open-Meteo adapter currently supports current observations only",
      );
    const url = new URL(
      this.options.customerEndpoint
        ? "https://customer-api.open-meteo.com/v1/forecast"
        : "https://api.open-meteo.com/v1/forecast",
    );
    url.search = new URLSearchParams({
      latitude: String(input.coordinates.latitude),
      longitude: String(input.coordinates.longitude),
      current: "temperature_2m,weather_code",
      timezone: input.timeZone ?? "auto",
      timeformat: "unixtime",
    }).toString();
    if (this.options.apiKey)
      url.searchParams.set("apikey", this.options.apiKey);

    const raw = await requestProviderJson(
      this.fetcher,
      url,
      { cache: "no-store" },
      this.timeoutMs,
    );
    const retrievedAt = providerTimestamp();
    const response = parseProviderResponse(responseSchema, raw);
    const items = weatherObservationSchema.parse({
      coordinates: input.coordinates,
      observedAt: new Date(response.current.time * 1_000).toISOString(),
      timeZone: response.timezone,
      temperatureCelsius: response.current.temperature_2m,
      conditionCode: String(response.current.weather_code),
      source: {
        status: "PROVIDER_SOURCED",
        provider: this.name,
        retrievedAt,
        validUntil: null,
        confidence: null,
        attribution: "Weather data by Open-Meteo (CC BY 4.0)",
        note: this.options.customerEndpoint
          ? "Live weather observation; subject to model update delay."
          : "Development/non-commercial Open-Meteo free endpoint; not for commercial production use.",
      } satisfies SourceMetadata,
    });
    return {
      items,
      source: {
        status: "PROVIDER_SOURCED",
        provider: this.name,
        retrievedAt,
        validUntil: null,
        confidence: null,
        attribution: "Weather data by Open-Meteo (CC BY 4.0)",
      },
    };
  }
}

export function openMeteoUnavailableError(): DomainError {
  return new DomainError(
    "CONFIGURATION_ERROR",
    "Production weather requires an Open-Meteo commercial API key",
  );
}
