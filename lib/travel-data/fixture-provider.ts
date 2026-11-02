import rawJaipurPlaces from "../../data/destinations/jaipur-in/places.json";
import { travelPlaceSchema } from "@/lib/domain/travel-data-schemas";
import type {
  TravelDataProvider,
  TravelPlace,
  TravelProviderResult,
} from "./types";

const jaipurPlaces = travelPlaceSchema
  .array()
  .parse(rawJaipurPlaces)
  .map(({ id, name }) => ({ id, name }));

function emptyResult(
  provider: string,
  note: string,
): TravelProviderResult<TravelPlace[]> {
  return {
    status: "unavailable",
    data: [],
    source: { source: "UNAVAILABLE", provider, retrievedAt: null, note },
  };
}

/** Offline fixture adapter over the checked-in, source-reviewed Jaipur attraction names. */
export class LocalFixtureTravelDataProvider implements TravelDataProvider {
  readonly name = "local_fixture";

  async searchPlaces(
    query: string,
  ): Promise<TravelProviderResult<TravelPlace[]>> {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized)
      return emptyResult(this.name, "A non-empty place query is required.");
    const matches = jaipurPlaces.filter(
      (place) =>
        normalized.includes(place.name.toLocaleLowerCase()) ||
        place.name.toLocaleLowerCase().includes(normalized),
    );
    if (!matches.length)
      return emptyResult(
        this.name,
        "No matching checked-in Jaipur place fixture exists; no results were generated.",
      );
    return {
      status: "available",
      data: matches,
      source: {
        source: "PROVIDER_SOURCED",
        provider: this.name,
        retrievedAt: null,
        note: "Checked-in Jaipur factual names only; coordinates, hours, prices, ratings, and availability are not included.",
      },
    };
  }

  searchHotels = async () =>
    emptyResult(this.name, "No accommodation fixtures are available.");
  searchRestaurants = async () =>
    emptyResult(this.name, "No restaurant fixtures are available.");
  getRoute = async () => ({
    status: "unavailable" as const,
    data: null,
    source: {
      source: "UNAVAILABLE" as const,
      provider: this.name,
      retrievedAt: null,
      note: "No route fixtures are available.",
    },
  });
  getWeather = async () => ({
    status: "unavailable" as const,
    data: null,
    source: {
      source: "UNAVAILABLE" as const,
      provider: this.name,
      retrievedAt: null,
      note: "No weather fixtures are available.",
    },
  });
  getCurrencyRate = async () => ({
    status: "unavailable" as const,
    data: null,
    source: {
      source: "UNAVAILABLE" as const,
      provider: this.name,
      retrievedAt: null,
      note: "No currency fixtures are available.",
    },
  });
}
