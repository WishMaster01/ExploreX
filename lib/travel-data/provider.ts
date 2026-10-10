import "server-only";
import { APP_CONFIG } from "@/lib/config";
import type {
  TravelDataProvider,
  TravelPlace,
  TravelProviderResult,
} from "./types";
import { fetchWithTimeout } from "./fetch-with-timeout";

type GooglePlaceResult = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
  }>;
};

const EMPTY_RESULT = (
  provider: string,
): TravelProviderResult<TravelPlace[]> => ({
  status: "unavailable",
  data: [],
  source: {
    source: "UNAVAILABLE",
    provider,
    retrievedAt: null,
    note: "No travel-data provider is configured for this category.",
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePlaces(value: unknown): TravelPlace[] {
  if (!isRecord(value) || !Array.isArray(value.places)) return [];
  return value.places.flatMap((place): TravelPlace[] => {
    if (!isRecord(place)) return [];
    const name = isRecord(place.displayName)
      ? place.displayName.text
      : undefined;
    if (typeof place.id !== "string" || typeof name !== "string") return [];
    return [
      {
        id: place.id,
        name,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
      },
    ];
  });
}

function unavailableData(provider: string) {
  return {
    status: "unavailable" as const,
    data: null,
    source: {
      source: "UNAVAILABLE" as const,
      provider,
      retrievedAt: null,
      note: "No provider is configured for this travel-data capability.",
    },
  };
}

class UnavailableTravelDataProvider implements TravelDataProvider {
  readonly name = "unavailable";
  searchPlaces = async () => EMPTY_RESULT(this.name);
  searchHotels = async () => EMPTY_RESULT(this.name);
  searchRestaurants = async () => EMPTY_RESULT(this.name);
  getRoute = async () => unavailableData(this.name);
  getWeather = async () => unavailableData(this.name);
  getCurrencyRate = async () => unavailableData(this.name);
}

export class GooglePlacesProvider implements TravelDataProvider {
  readonly name = "google_places";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  searchPlaces(query: string) {
    return this.search(query);
  }
  searchHotels(query: string) {
    return this.search(`${query} hotel`);
  }
  searchRestaurants(query: string) {
    return this.search(`${query} restaurant`);
  }
  getRoute = async () => unavailableData(this.name);
  getWeather = async () => unavailableData(this.name);
  getCurrencyRate = async () => unavailableData(this.name);

  private async search(
    query: string,
  ): Promise<TravelProviderResult<TravelPlace[]>> {
    try {
      const response = await fetchWithTimeout(
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
          body: JSON.stringify({ textQuery: query, pageSize: 5 }),
        },
        APP_CONFIG.travelData.timeoutMs,
      );
      if (!response.ok)
        return {
          status: "error",
          data: [],
          source: {
            source: "UNAVAILABLE",
            provider: this.name,
            retrievedAt: new Date().toISOString(),
            note: "Places provider request failed.",
          },
        };
      const places = parsePlaces(await response.json());
      return {
        status: "available",
        data: places,
        source: {
          source: "VERIFIED",
          provider: this.name,
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch {
      return {
        status: "error",
        data: [],
        source: {
          source: "UNAVAILABLE",
          provider: this.name,
          retrievedAt: new Date().toISOString(),
          note: "Places provider did not return usable data.",
        },
      };
    }
  }
}

export function getTravelDataProvider(): TravelDataProvider {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key
    ? new GooglePlacesProvider(key)
    : new UnavailableTravelDataProvider();
}

export function createGooglePlacesProvider(
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  return new GooglePlacesProvider(apiKey, fetcher);
}
