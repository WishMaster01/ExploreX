export const travelSourceTypes = [
  "VERIFIED",
  "PROVIDER_SOURCED",
  "COMMUNITY_SUBMITTED",
  "ESTIMATED",
  "AI_GENERATED",
  "STALE",
  "USER_PROVIDED",
  "UNAVAILABLE",
  "REJECTED",
] as const;

export type TravelSourceType = (typeof travelSourceTypes)[number];

export type TravelSourceMetadata = {
  source: TravelSourceType;
  provider: string | null;
  retrievedAt: string | null;
  placeId?: string;
  mapsUrl?: string;
  note?: string;
};

export type TravelPlace = {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  mapsUrl?: string;
};

export type TravelProviderResult<T> = {
  status: "available" | "unavailable" | "error";
  data: T;
  source: TravelSourceMetadata;
};

export interface TravelDataProvider {
  readonly name: string;
  searchPlaces(query: string): Promise<TravelProviderResult<TravelPlace[]>>;
  searchHotels(query: string): Promise<TravelProviderResult<TravelPlace[]>>;
  searchRestaurants(
    query: string,
  ): Promise<TravelProviderResult<TravelPlace[]>>;
  getRoute(): Promise<TravelProviderResult<null>>;
  getWeather(): Promise<TravelProviderResult<null>>;
  getCurrencyRate(): Promise<TravelProviderResult<null>>;
}

export function sourceMetadata(
  source: TravelSourceType,
  provider: string | null,
  note?: string,
  retrievedAt: string | null = null,
): TravelSourceMetadata {
  return { source, provider, retrievedAt, ...(note ? { note } : {}) };
}
