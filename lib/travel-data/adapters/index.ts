import "server-only";
import rawJaipurPlaces from "../../../data/destinations/jaipur-in/places.json";
import { travelPlaceSchema } from "@/lib/domain/travel-data-schemas";
import type { Coordinates, Place, SourceMetadata } from "@/lib/domain/travel";
import type {
  AccommodationProvider,
  CurrencyProvider,
  EventsProvider,
  GeocodingProvider,
  GeocodedLocation,
  PlacesProvider,
  ProviderResult,
  RoutingProvider,
  TransportProvider,
  WeatherProvider,
} from "@/lib/travel-data/ports";
import type { ServerEnvironment } from "@/lib/env";
import { getServerEnvironment } from "@/lib/env";
import { DomainError } from "@/lib/domain/errors";
import { GoogleMapsTravelAdapter } from "./google-maps";
import { OpenMeteoWeatherAdapter } from "./open-meteo";
import { FrankfurterCurrencyAdapter } from "./frankfurter";

const unavailableSource = (provider: string, note: string): SourceMetadata => ({
  status: "UNAVAILABLE",
  provider,
  retrievedAt: null,
  validUntil: null,
  confidence: null,
  note,
});

const unavailablePlaces: PlacesProvider = {
  async searchPlaces(): Promise<ProviderResult<Place[]>> {
    return { items: [], source: unavailableSource("unconfigured", "Place search provider is not configured.") };
  },
};
const unavailableGeocoding: GeocodingProvider = {
  async geocode(): Promise<ProviderResult<GeocodedLocation[]>> {
    return { items: [], source: unavailableSource("unconfigured", "Geocoding provider is not configured.") };
  },
};
const unavailableRouting: RoutingProvider = {
  async getRoute(): Promise<ProviderResult<null>> {
    return { items: null, source: unavailableSource("unconfigured", "Route provider is not configured; no duration or road distance is available.") };
  },
};
const unavailableWeather: WeatherProvider = {
  async getWeather(): Promise<ProviderResult<null>> {
    return { items: null, source: unavailableSource("unconfigured", "Weather provider is not configured.") };
  },
};
const unavailableAccommodation: AccommodationProvider = {
  async searchAccommodation(): Promise<ProviderResult<[]>> {
    return { items: [], source: unavailableSource("unconfigured", "No authorized accommodation availability provider is configured.") };
  },
};
const unavailableTransport: TransportProvider = {
  async searchTransport(): Promise<ProviderResult<[]>> {
    return { items: [], source: unavailableSource("unconfigured", "No authorized transport availability provider is configured.") };
  },
};
const unavailableCurrency: CurrencyProvider = {
  async getRate(): Promise<ProviderResult<null>> {
    return { items: null, source: unavailableSource("unconfigured", "Currency provider is not configured.") };
  },
};
const unavailableEvents: EventsProvider = {
  async searchEvents(): Promise<ProviderResult<[]>> {
    return { items: [], source: unavailableSource("unconfigured", "No official event provider is configured.") };
  },
};

const jaipurPlaces = travelPlaceSchema.array().parse(rawJaipurPlaces);
const localMockPlaces: PlacesProvider = {
  async searchPlaces(input) {
    const query = input.query.trim().toLocaleLowerCase();
    const retrievedAt = new Date().toISOString();
    const places = query
      ? jaipurPlaces.filter((place) =>
          place.destinationId === input.destination.id &&
          place.name.toLocaleLowerCase().includes(query),
        )
      : [];
    const items = places.map((place) => ({
      id: place.id,
      destinationId: place.destinationId,
      name: place.name,
      source: {
        status: place.verificationStatus === "VERIFIED" ? "VERIFIED" : "STALE",
        provider: "checked_in_travel_catalog",
        sourceId: place.id,
        retrievedAt,
        validUntil: null,
        confidence: null,
        ...(place.provenance.attribution
          ? { attribution: place.provenance.attribution }
          : {}),
        note: "Local mock mode; checked-in place name only, with no live provider confirmation.",
      } satisfies SourceMetadata,
    } satisfies Place));
    return {
      items,
      source: {
        status: "CURATED",
        provider: "local_mock_catalog",
        retrievedAt,
        validUntil: null,
        confidence: null,
        note: "Local mock mode uses checked-in Jaipur name records only.",
      } satisfies SourceMetadata,
    };
  },
};

export type TravelProviderAdapters = {
  places: PlacesProvider;
  geocoding: GeocodingProvider;
  routing: RoutingProvider;
  weather: WeatherProvider;
  accommodation: AccommodationProvider;
  transport: TransportProvider;
  currency: CurrencyProvider;
  events: EventsProvider;
};

export function createTravelProviderAdapters(
  environment: ServerEnvironment,
  options: { fetcher?: typeof fetch; nodeEnvironment?: string } = {},
): TravelProviderAdapters {
  const fetcher = options.fetcher ?? fetch;
  const mode = environment.TRAVEL_ADAPTER_MODE;
  if (mode === "disabled")
    return unavailableAdapters();
  if (mode === "mock") {
    if ((options.nodeEnvironment ?? process.env.NODE_ENV) === "production")
      throw new DomainError("CONFIGURATION_ERROR", "Mock travel adapters cannot run in production");
    return { ...unavailableAdapters(), places: localMockPlaces };
  }

  const maps = environment.GOOGLE_MAPS_API_KEY
    ? new GoogleMapsTravelAdapter(environment.GOOGLE_MAPS_API_KEY, fetcher)
    : null;
  const weatherAllowed = environment.OPEN_METEO_API_KEY
    ? true
    : (options.nodeEnvironment ?? process.env.NODE_ENV) !== "production";
  return {
    places:
      environment.TRAVEL_PLACES_PROVIDER === "disabled"
        ? unavailablePlaces
        : maps ?? unavailablePlaces,
    geocoding:
      environment.TRAVEL_GEOCODING_PROVIDER === "disabled"
        ? unavailableGeocoding
        : maps ?? unavailableGeocoding,
    routing:
      environment.TRAVEL_ROUTING_PROVIDER === "disabled"
        ? unavailableRouting
        : maps ?? unavailableRouting,
    weather:
      environment.TRAVEL_WEATHER_PROVIDER === "disabled"
        ? unavailableWeather
        : weatherAllowed
      ? new OpenMeteoWeatherAdapter(
          {
            apiKey: environment.OPEN_METEO_API_KEY,
            customerEndpoint: Boolean(environment.OPEN_METEO_API_KEY),
          },
          fetcher,
        )
      : unavailableWeather,
    accommodation: unavailableAccommodation,
    transport: unavailableTransport,
    currency:
      environment.TRAVEL_CURRENCY_PROVIDER === "disabled"
        ? unavailableCurrency
        : new FrankfurterCurrencyAdapter(fetcher),
    events: unavailableEvents,
  };
}

export function getTravelProviderAdapters(): TravelProviderAdapters {
  return createTravelProviderAdapters(getServerEnvironment());
}

function unavailableAdapters(): TravelProviderAdapters {
  return {
    places: unavailablePlaces,
    geocoding: unavailableGeocoding,
    routing: unavailableRouting,
    weather: unavailableWeather,
    accommodation: unavailableAccommodation,
    transport: unavailableTransport,
    currency: unavailableCurrency,
    events: unavailableEvents,
  };
}
