import type {
  Coordinates,
  Destination,
  Discovery,
  Hotel,
  MoneyEstimate,
  Restaurant,
  RouteLeg,
  SourceMetadata,
  TravelGuide,
  WeatherObservation,
} from "@/lib/domain/travel";

export type ProviderResult<T> = {
  items: T;
  source: SourceMetadata;
};

export type PlaceSearchInput = {
  query: string;
  destination: Destination;
  limit: number;
  languageCode?: string;
};

export type GeocodeInput = {
  query: string;
  countryCode?: string;
  languageCode?: string;
};

export type RouteInput = {
  origin: Coordinates;
  destination: Coordinates;
  mode: RouteLeg["mode"];
  departureTime?: string;
};

export type WeatherInput = {
  coordinates: Coordinates;
  timeZone?: string;
  at?: string;
};

export type AccommodationSearchInput = PlaceSearchInput & {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  currencyCode?: string;
};

export type TransportSearchInput = {
  origin: Destination;
  destination: Destination;
  departureDate?: string;
  passengers?: number;
  currencyCode?: string;
};

export type CurrencyRateInput = {
  baseCurrency: string;
  quoteCurrency: string;
  at?: string;
};

export type EventSearchInput = {
  destination: Destination;
  from?: string;
  to?: string;
  languageCode?: string;
};

export interface PlacesProvider {
  searchPlaces(input: PlaceSearchInput): Promise<ProviderResult<Discovery[]>>;
}

export interface GeocodingProvider {
  geocode(input: GeocodeInput): Promise<ProviderResult<Coordinates[]>>;
}

export interface RoutingProvider {
  getRoute(input: RouteInput): Promise<ProviderResult<RouteLeg | null>>;
}

export interface WeatherProvider {
  getWeather(
    input: WeatherInput,
  ): Promise<ProviderResult<WeatherObservation | null>>;
}

export interface AccommodationProvider {
  searchAccommodation(
    input: AccommodationSearchInput,
  ): Promise<ProviderResult<Hotel[]>>;
}

export type TransportOption = {
  id: string;
  mode: RouteLeg["mode"];
  originId: string;
  destinationId: string;
  departureAt?: string;
  arrivalAt?: string;
  price?: MoneyEstimate;
  source: SourceMetadata;
};

export interface TransportProvider {
  searchTransport(
    input: TransportSearchInput,
  ): Promise<ProviderResult<TransportOption[]>>;
}

export type CurrencyRate = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  asOf: string;
};

export interface CurrencyProvider {
  getRate(
    input: CurrencyRateInput,
  ): Promise<ProviderResult<CurrencyRate | null>>;
}

export interface EventsProvider {
  searchEvents(input: EventSearchInput): Promise<ProviderResult<Discovery[]>>;
}

export interface TravelGuideRepository {
  getGuide(
    destinationId: string,
    languageCode: string,
  ): Promise<TravelGuide | null>;
}
