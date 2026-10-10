export const travelSourceTypes = [
  "VERIFIED",
  "ESTIMATED",
  "AI_GENERATED",
  "USER_PROVIDED",
  "UNAVAILABLE",
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
  getRoute(
    origin: string,
    destination: string,
  ): Promise<TravelProviderResult<unknown>>;
  getWeather(
    latitude: number,
    longitude: number,
  ): Promise<TravelProviderResult<unknown>>;
  getCurrencyRate(
    from: string,
    to: string,
  ): Promise<TravelProviderResult<unknown>>;
}

export function sourceMetadata(
  source: TravelSourceType,
  provider: string | null,
  note?: string,
  retrievedAt: string | null = null,
): TravelSourceMetadata {
  return { source, provider, retrievedAt, ...(note ? { note } : {}) };
}
