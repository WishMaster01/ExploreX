import "server-only";
import { z } from "zod";
import { DomainError } from "@/lib/domain/errors";
import {
  coordinatesSchema,
  placeSchema,
  routeLegSchema,
} from "@/lib/domain/travel";
import type { SourceMetadata } from "@/lib/domain/travel";
import type { Destination, Place, RouteLeg } from "@/lib/domain/travel";
import type {
  GeocodeInput,
  GeocodingProvider,
  GeocodedLocation,
  PlaceSearchInput,
  PlacesProvider,
  ProviderResult,
  RouteInput,
  RoutingProvider,
} from "@/lib/travel-data/ports";
import { APP_CONFIG } from "@/lib/config";
import {
  requestProviderJson,
  parseProviderResponse,
  providerTimestamp,
} from "./http";

const googlePlacesResponseSchema = z.object({
  places: z.array(
    z.object({
      id: z.string().min(1).max(300),
      displayName: z.object({ text: z.string().trim().min(1).max(300) }),
    }),
  ),
});
const googleGeocodingResponseSchema = z.object({
  status: z.enum([
    "OK",
    "ZERO_RESULTS",
    "OVER_QUERY_LIMIT",
    "OVER_DAILY_LIMIT",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
    "UNKNOWN_ERROR",
  ]),
  results: z.array(
    z.object({
      place_id: z.string().min(1).max(300).optional(),
      geometry: z.object({
        location: z.object({
          lat: z.number().finite(),
          lng: z.number().finite(),
        }),
      }),
    }),
  ),
});
const googleRoutesResponseSchema = z.object({
  routes: z.array(
    z.object({
      distanceMeters: z.number().finite().nonnegative(),
      duration: z.string().regex(/^\d+(?:\.\d+)?s$/),
    }),
  ),
});

function source(
  provider: string,
  retrievedAt: string,
  extras: Partial<SourceMetadata> = {},
): SourceMetadata {
  return {
    status: "PROVIDER_SOURCED",
    provider,
    retrievedAt,
    validUntil: null,
    confidence: null,
    attribution: "Google Maps Platform",
    ...extras,
  };
}

export class GoogleMapsTravelAdapter
  implements PlacesProvider, GeocodingProvider, RoutingProvider
{
  readonly name = "google_maps_platform";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs: number = APP_CONFIG.travelData.timeoutMs,
  ) {
    if (!apiKey.trim())
      throw new DomainError(
        "CONFIGURATION_ERROR",
        "Google Maps requires an API key",
      );
  }

  async searchPlaces(
    input: PlaceSearchInput,
  ): Promise<ProviderResult<Place[]>> {
    const query = input.query.trim();
    if (!query)
      throw new DomainError("VALIDATION_ERROR", "Place query is required");
    if (!Number.isInteger(input.limit) || input.limit < 1)
      throw new DomainError(
        "VALIDATION_ERROR",
        "Place result limit must be a positive integer",
      );
    const limit = Math.max(1, Math.min(20, Math.floor(input.limit)));
    const raw = await requestProviderJson(
      this.fetcher,
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({
          textQuery: `${query}, ${input.destination.name}`,
          pageSize: limit,
          ...(input.languageCode ? { languageCode: input.languageCode } : {}),
          regionCode: input.destination.countryCode,
        }),
      },
      this.timeoutMs,
    );
    const retrievedAt = providerTimestamp();
    const response = parseProviderResponse(googlePlacesResponseSchema, raw);
    const items = parseProviderResponse(
      z.array(placeSchema),
      response.places.map((place) => ({
        id: place.id,
        destinationId: input.destination.id,
        name: place.displayName.text,
        source: source(this.name, retrievedAt, { sourceId: place.id }),
      })),
    );
    return { items, source: source(this.name, retrievedAt) };
  }

  async geocode(
    input: GeocodeInput,
  ): Promise<ProviderResult<GeocodedLocation[]>> {
    const query = input.query.trim();
    if (!query)
      throw new DomainError("VALIDATION_ERROR", "Geocoding query is required");
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", this.apiKey);
    if (input.countryCode)
      url.searchParams.set(
        "components",
        `country:${input.countryCode.toLowerCase()}`,
      );
    if (input.languageCode)
      url.searchParams.set("language", input.languageCode);
    const raw = await requestProviderJson(
      this.fetcher,
      url,
      { cache: "no-store" },
      this.timeoutMs,
    );
    const retrievedAt = providerTimestamp();
    const response = parseProviderResponse(googleGeocodingResponseSchema, raw);
    if (response.status === "ZERO_RESULTS")
      return {
        items: [],
        source: source(this.name, retrievedAt, {
          note: "No geocoding result.",
        }),
      };
    if (response.status === "OVER_QUERY_LIMIT")
      throw new DomainError(
        "RATE_LIMITED",
        "Google Geocoding quota was reached",
        { retryable: true },
      );
    if (response.status === "UNKNOWN_ERROR")
      throw new DomainError(
        "PROVIDER_UNAVAILABLE",
        "Google Geocoding is temporarily unavailable",
        { retryable: true },
      );
    if (
      response.status === "OVER_DAILY_LIMIT" ||
      response.status === "REQUEST_DENIED"
    )
      throw new DomainError(
        "CONFIGURATION_ERROR",
        "Google Geocoding rejected its credentials or permissions",
      );
    if (response.status !== "OK")
      throw new DomainError(
        "CONFIGURATION_ERROR",
        "Google Geocoding rejected the request",
      );
    const items = parseProviderResponse(
      z.array(
        z
          .object({
            coordinates: coordinatesSchema,
            sourceId: z.string().min(1).max(300).optional(),
          })
          .strict(),
      ),
      response.results.map(({ geometry, place_id }) => ({
        coordinates: {
          latitude: geometry.location.lat,
          longitude: geometry.location.lng,
        },
        ...(place_id ? { sourceId: place_id } : {}),
      })),
    );
    return { items, source: source(this.name, retrievedAt) };
  }

  async getRoute(input: RouteInput): Promise<ProviderResult<RouteLeg | null>> {
    let travelMode: "DRIVE" | "WALK" | "TRANSIT";
    switch (input.mode) {
      case "drive":
        travelMode = "DRIVE";
        break;
      case "walk":
        travelMode = "WALK";
        break;
      case "transit":
        travelMode = "TRANSIT";
        break;
      default:
        throw new DomainError(
          "VALIDATION_ERROR",
          "Google Routes supports drive, walk, or transit modes only",
        );
    }
    const raw = await requestProviderJson(
      this.fetcher,
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: input.origin.latitude,
                longitude: input.origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: input.destination.latitude,
                longitude: input.destination.longitude,
              },
            },
          },
          travelMode,
          ...(input.departureTime
            ? { departureTime: input.departureTime }
            : {}),
          units: "METRIC",
        }),
      },
      this.timeoutMs,
    );
    const retrievedAt = providerTimestamp();
    const response = parseProviderResponse(googleRoutesResponseSchema, raw);
    const route = response.routes[0];
    if (!route)
      return {
        items: null,
        source: source(this.name, retrievedAt, {
          note: "No route was returned for this pair and mode.",
        }),
      };
    const durationSeconds = Number(route.duration.slice(0, -1));
    const items = parseProviderResponse(routeLegSchema, {
      origin: input.origin,
      destination: input.destination,
      distanceMeters: route.distanceMeters,
      durationSeconds,
      mode: input.mode,
      source: source(this.name, retrievedAt),
    });
    return { items, source: source(this.name, retrievedAt) };
  }
}
