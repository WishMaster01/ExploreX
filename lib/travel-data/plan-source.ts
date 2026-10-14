import type { ValidTripInfo } from "@/lib/domain/schemas";
import type {
  TravelPlace,
  TravelProviderResult,
  TravelSourceMetadata,
} from "./types";
import { normalizePlaceName } from "./provider-name";
import { sourceMetadata } from "./types";
import { serverLogger } from "@/lib/observability/server-logger";

export function markCandidateSources(plan: ValidTripInfo): ValidTripInfo {
  return {
    ...plan,
    budget_source_metadata: sourceMetadata(
      "AI_GENERATED",
      "openrouter",
      "Budget figures are estimates, not current quotes.",
    ),
    hotels: plan.hotels.map((hotel) => ({
      ...hotel,
      source_metadata: sourceMetadata(
        "AI_GENERATED",
        "openrouter",
        "Existence, address, coordinates, rating, and price have not been verified.",
      ),
    })),
    ...(plan.restaurants
      ? {
          restaurants: plan.restaurants.map((restaurant) => ({
            ...restaurant,
            source_metadata: sourceMetadata(
              "AI_GENERATED",
              "openrouter",
              "Restaurant listing, hours, menu, and prices have not been verified.",
            ),
          })),
        }
      : {}),
    itinerary: plan.itinerary.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        source_metadata: sourceMetadata(
          "AI_GENERATED",
          "openrouter",
          "Existence, address, coordinates, hours, and price have not been verified.",
        ),
        travel_estimate_source: "ESTIMATED" as const,
      })),
    })),
  };
}

export function verifiedPlaceMatch(
  name: string,
  result: TravelProviderResult<TravelPlace[]>,
): TravelPlace | undefined {
  if (result.status !== "available") return undefined;
  const normalized = normalizePlaceName(name);
  return result.data.find(
    (place) => normalizePlaceName(place.name) === normalized,
  );
}

export function verifiedPlaceMetadata(
  place: TravelPlace,
  retrievedAt: string | null,
): TravelSourceMetadata {
  return {
    source: "VERIFIED",
    provider: "google_places",
    retrievedAt,
    placeId: place.id,
    ...(place.mapsUrl ? { mapsUrl: place.mapsUrl } : {}),
    note: "The exact place name was matched to a Google Maps listing. Address, coordinates, hours, prices, images, and availability are not verified.",
  };
}

export async function safelySearchPlaces(
  provider: string,
  operation: () => Promise<TravelProviderResult<TravelPlace[]>>,
): Promise<TravelProviderResult<TravelPlace[]>> {
  try {
    return await operation();
  } catch (error) {
    const queueFull =
      error instanceof Error && error.message.endsWith("request queue is full");
    serverLogger.warn("travel_data.request.failed", {
      provider,
      errorCode: queueFull ? "QUEUE_FULL" : "PROVIDER_ERROR",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return {
      status: "error",
      data: [],
      source: {
        source: "UNAVAILABLE",
        provider,
        retrievedAt: new Date().toISOString(),
        note: "Travel-data provider failed; AI-generated candidates remain unverified.",
      },
    };
  }
}
