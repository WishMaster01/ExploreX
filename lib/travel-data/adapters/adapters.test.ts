import { afterEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain/errors";
import { getServerEnvironment } from "@/lib/env";
import type { Destination } from "@/lib/domain/travel";
import { createTravelProviderAdapters } from "./index";
import { GoogleMapsTravelAdapter } from "./google-maps";
import { OpenMeteoWeatherAdapter } from "./open-meteo";
import { FrankfurterCurrencyAdapter } from "./frankfurter";

const destination: Destination = {
  id: "jaipur-in",
  name: "Jaipur",
  countryCode: "IN",
  coordinates: { latitude: 26.9124, longitude: 75.7873 },
  source: {
    status: "VERIFIED",
    provider: "ExploreX catalog",
    retrievedAt: "2026-10-28T00:00:00.000Z",
    validUntil: null,
    confidence: 1,
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

afterEach(() => vi.restoreAllMocks());

describe("Google Maps provider adapters", () => {
  it("normalizes place search and keeps credentials in a server request header", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        places: [{ id: "place-123", displayName: { text: "Amber Palace" } }],
      }),
    );
    const adapter = new GoogleMapsTravelAdapter("private-key", fetcher);
    const result = await adapter.searchPlaces({
      query: "Amber Palace",
      destination,
      limit: 5,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "place-123",
      destinationId: "jaipur-in",
      name: "Amber Palace",
      source: { status: "PROVIDER_SOURCED", sourceId: "place-123" },
    });
    const [url, init] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).not.toContain("private-key");
    expect(new Headers(init.headers).get("X-Goog-Api-Key")).toBe("private-key");
    expect(new Headers(init.headers).get("X-Goog-FieldMask")).toBe(
      "places.id,places.displayName",
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      textQuery: "Amber Palace, Jaipur",
      pageSize: 5,
    });
  });

  it("rejects malformed place responses", async () => {
    const adapter = new GoogleMapsTravelAdapter(
      "key",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ places: [{ id: "missing-name" }] })),
    );
    await expect(
      adapter.searchPlaces({ query: "Museum", destination, limit: 2 }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("normalizes geocoding coordinates and handles zero results explicitly", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          results: [
            {
              place_id: "geo-1",
              geometry: { location: { lat: 26.9, lng: 75.8 } },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: "ZERO_RESULTS", results: [] }),
      );
    const adapter = new GoogleMapsTravelAdapter("key", fetcher);
    const first = await adapter.geocode({ query: "Jaipur", countryCode: "IN" });
    const second = await adapter.geocode({ query: "no such place" });
    expect(first.items).toEqual([
      {
        coordinates: { latitude: 26.9, longitude: 75.8 },
        sourceId: "geo-1",
      },
    ]);
    expect(first.source.status).toBe("PROVIDER_SOURCED");
    expect(second.items).toEqual([]);
    expect(second.source.note).toBe("No geocoding result.");
  });

  it("does not accept invalid coordinates from a geocoder", async () => {
    const adapter = new GoogleMapsTravelAdapter(
      "key",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "OK",
          results: [{ geometry: { location: { lat: 123, lng: 0 } } }],
        }),
      ),
    );
    await expect(adapter.geocode({ query: "Somewhere" })).rejects.toMatchObject(
      {
        code: "PROVIDER_UNAVAILABLE",
      },
    );
  });

  it("returns provider road distance and duration without estimating either", async () => {
    const adapter = new GoogleMapsTravelAdapter(
      "key",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({
            routes: [{ distanceMeters: 12_345, duration: "1200s" }],
          }),
        ),
    );
    const result = await adapter.getRoute({
      origin: { latitude: 26.9, longitude: 75.8 },
      destination: { latitude: 26.91, longitude: 75.81 },
      mode: "drive",
    });
    expect(result.items).toMatchObject({
      distanceMeters: 12_345,
      durationSeconds: 1_200,
      mode: "drive",
      source: { status: "PROVIDER_SOURCED", provider: "google_maps_platform" },
    });
    expect(result.items?.source.note).toBeUndefined();
  });

  it("maps invalid credentials and provider quotas to typed errors without leaking keys", async () => {
    const unauthorized = new GoogleMapsTravelAdapter(
      "top-secret",
      vi
        .fn()
        .mockResolvedValue(
          new Response("credential diagnostics", { status: 401 }),
        ),
    );
    await expect(
      unauthorized.searchPlaces({ query: "Museum", destination, limit: 1 }),
    ).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });

    const limited = new GoogleMapsTravelAdapter(
      "key",
      vi.fn().mockResolvedValue(new Response("quota", { status: 429 })),
    );
    await expect(
      limited.searchPlaces({ query: "Museum", destination, limit: 1 }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", retryable: true });
  });

  it("retries a transient server error once and stops", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ places: [] }));
    const adapter = new GoogleMapsTravelAdapter("key", fetcher);
    const result = await adapter.searchPlaces({
      query: "Museum",
      destination,
      limit: 1,
    });
    expect(result.items).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable authentication errors", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("no", { status: 403 }));
    const adapter = new GoogleMapsTravelAdapter("key", fetcher);
    await expect(
      adapter.searchPlaces({ query: "Museum", destination, limit: 1 }),
    ).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("bounds retries for a timeout and returns a typed timeout error", async () => {
    const timeout = new Error("transport detail");
    timeout.name = "AbortError";
    const fetcher = vi.fn().mockRejectedValue(timeout);
    const adapter = new GoogleMapsTravelAdapter("key", fetcher, 10);
    await expect(
      adapter.searchPlaces({ query: "Museum", destination, limit: 1 }),
    ).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT", retryable: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("Open-Meteo and Frankfurter adapters", () => {
  it("normalizes current weather with observation time and attribution", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        current: { time: 1_798_663_200, temperature_2m: 27.5, weather_code: 2 },
        timezone: "Asia/Kolkata",
      }),
    );
    const result = await new OpenMeteoWeatherAdapter({}, fetcher).getWeather({
      coordinates: { latitude: 26.9, longitude: 75.8 },
    });
    expect(result.items).toMatchObject({
      coordinates: { latitude: 26.9, longitude: 75.8 },
      temperatureCelsius: 27.5,
      conditionCode: "2",
      timeZone: "Asia/Kolkata",
      source: {
        status: "PROVIDER_SOURCED",
        attribution: "Weather data by Open-Meteo (CC BY 4.0)",
      },
    });
    expect(new URL(String(fetcher.mock.calls[0][0])).hostname).toBe(
      "api.open-meteo.com",
    );
  });

  it("uses the paid Open-Meteo endpoint and keeps the subscription key server-side", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        current: { time: 1_798_663_200, temperature_2m: 20, weather_code: 0 },
        timezone: "Asia/Kolkata",
      }),
    );
    await new OpenMeteoWeatherAdapter(
      { apiKey: "subscription-secret", customerEndpoint: true },
      fetcher,
    ).getWeather({ coordinates: { latitude: 26.9, longitude: 75.8 } });
    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain("customer-api.open-meteo.com");
    expect(url).toContain("subscription-secret");
  });

  it("rejects malformed weather response without producing a fallback observation", async () => {
    const adapter = new OpenMeteoWeatherAdapter(
      {},
      vi.fn().mockResolvedValue(jsonResponse({ current: {}, timezone: "" })),
    );
    await expect(
      adapter.getWeather({ coordinates: { latitude: 26.9, longitude: 75.8 } }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("normalizes a reference currency rate and labels it as non-transactional", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          date: "2026-11-03",
          base: "USD",
          quote: "INR",
          rate: 88.5,
        }),
      );
    const result = await new FrankfurterCurrencyAdapter(fetcher).getRate({
      baseCurrency: "usd",
      quoteCurrency: "inr",
    });
    expect(result.items).toEqual({
      baseCurrency: "USD",
      quoteCurrency: "INR",
      rate: 88.5,
      asOf: "2026-11-03T00:00:00.000Z",
    });
    expect(result.source.note).toContain(
      "not a cash, card, or transaction quote",
    );
    expect(result.source.sourceId).toBe("USD/INR/2026-11-03");
  });

  it("rejects malformed rates and invalid currency inputs", async () => {
    const invalidResponse = new FrankfurterCurrencyAdapter(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ date: "bad", base: "USD", quote: "INR", rate: -1 }),
        ),
    );
    await expect(
      invalidResponse.getRate({ baseCurrency: "USD", quoteCurrency: "INR" }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(
      invalidResponse.getRate({ baseCurrency: "USDD", quoteCurrency: "INR" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("provider composition", () => {
  it("returns explicit unavailable results when no credentialed provider is configured", async () => {
    const env = getServerEnvironment({
      ...process.env,
      TRAVEL_ADAPTER_MODE: "auto",
    });
    const providers = createTravelProviderAdapters(env, {
      nodeEnvironment: "production",
      fetcher: vi.fn(),
    });
    expect(
      (
        await providers.places.searchPlaces({
          query: "Palace",
          destination,
          limit: 2,
        })
      ).source.status,
    ).toBe("UNAVAILABLE");
    expect(
      (
        await providers.routing.getRoute({
          origin: { latitude: 26.9, longitude: 75.8 },
          destination: { latitude: 26.91, longitude: 75.81 },
          mode: "drive",
        })
      ).items,
    ).toBeNull();
    expect(
      (
        await providers.accommodation.searchAccommodation({
          query: "stay",
          destination,
          limit: 2,
        })
      ).items,
    ).toEqual([]);
    expect(
      (
        await providers.transport.searchTransport({
          origin: destination,
          destination,
          passengers: 1,
        })
      ).items,
    ).toEqual([]);
    expect(
      (await providers.events.searchEvents({ destination })).items,
    ).toEqual([]);
  });

  it("uses checked-in Jaipur place names only in explicit local mock mode", async () => {
    const env = getServerEnvironment({
      ...process.env,
      TRAVEL_ADAPTER_MODE: "mock",
    });
    const providers = createTravelProviderAdapters(env, {
      nodeEnvironment: "development",
      fetcher: vi.fn(),
    });
    const result = await providers.places.searchPlaces({
      query: "Amber Palace",
      destination,
      limit: 3,
    });
    expect(result.items.map(({ name }) => name)).toEqual(["Amber Palace"]);
    expect(result.items[0].source.note).toContain(
      "no live provider confirmation",
    );
  });

  it("refuses local mock mode in production", () => {
    const env = getServerEnvironment({
      ...process.env,
      TRAVEL_ADAPTER_MODE: "mock",
    });
    expect(() =>
      createTravelProviderAdapters(env, { nodeEnvironment: "production" }),
    ).toThrow(DomainError);
  });
});
