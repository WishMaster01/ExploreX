import { describe, expect, it, vi } from "vitest";
import { withExponentialBackoff } from "@/lib/async-request-queue";
import { createTripPlanCacheKey } from "./cache-key";
import { parseAiOutput } from "./validation";
import { chatResponseSchema } from "@/lib/ai-schemas";
import { MalformedAiOutputError } from "./errors";
import {
  markCandidateSources,
  safelySearchPlaces,
  verifiedPlaceMatch,
} from "@/lib/travel-data/plan-source";
import {
  createGooglePlacesProvider,
  getTravelDataProvider,
} from "@/lib/travel-data/provider";
import type { TravelProviderResult } from "@/lib/travel-data/types";
import { tripInfoSchema } from "@/lib/ai-schemas";
import { sanitizeSavedPlanSources } from "@/lib/travel-data/sanitize-saved-plan";

describe("AI generation hardening", () => {
  it("rejects malformed or schema-invalid AI JSON", () => {
    expect(() => parseAiOutput("not json", chatResponseSchema, true)).toThrow(
      MalformedAiOutputError,
    );
    expect(() =>
      parseAiOutput('{"resp":"ok","ui":"unknown"}', chatResponseSchema, true),
    ).toThrow(MalformedAiOutputError);
  });

  it("retries transient errors and stops on permanent errors", async () => {
    const transient = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue("ok");
    await expect(
      withExponentialBackoff(transient, {
        retries: 2,
        baseDelayMs: 0,
        jitterMs: 0,
        shouldRetry: (error) =>
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          Number(error.status) >= 500,
      }),
    ).resolves.toBe("ok");
    expect(transient).toHaveBeenCalledTimes(2);

    const permanent = vi.fn().mockRejectedValue({ status: 400 });
    await expect(
      withExponentialBackoff(permanent, {
        retries: 3,
        shouldRetry: (error) =>
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          Number(error.status) >= 500,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(permanent).toHaveBeenCalledTimes(1);
  });

  it("uses deterministic cache keys isolated by user and prompt version", () => {
    const base = {
      userId: "user-a",
      promptVersion: "trip-planner-v2",
      model: "model-a",
      messages: [{ role: "user", content: "Paris" }],
    };
    expect(createTripPlanCacheKey(base)).toBe(createTripPlanCacheKey(base));
    expect(createTripPlanCacheKey(base)).not.toBe(
      createTripPlanCacheKey({ ...base, userId: "user-b" }),
    );
    expect(createTripPlanCacheKey(base)).not.toBe(
      createTripPlanCacheKey({ ...base, promptVersion: "trip-planner-v3" }),
    );
  });
});

describe("travel data source safety", () => {
  const candidate = tripInfoSchema.parse({
    destination: "Paris",
    duration: "1 day",
    origin: "London",
    budget: "€500",
    group_size: "Solo",
    hotels: [
      {
        hotel_name: "Example Hotel",
        hotel_address: "Paris",
        price_per_night: "€100",
        hotel_image_url: "",
        geo_coordinates: { latitude: 48.8, longitude: 2.3 },
        rating: 4,
        description: "A stay",
      },
    ],
    itinerary: [
      {
        day: 1,
        day_plan: "Explore",
        best_time_to_visit_day: "Morning",
        activities: [
          {
            place_name: "Example Museum",
            place_details: "A museum",
            place_image_url: "",
            geo_coordinates: { latitude: 48.8, longitude: 2.3 },
            place_address: "Paris",
            ticket_pricing: "unknown",
            estimated_cost: 0,
            time_travel_each_location: "10 minutes",
            best_time_to_visit: "Morning",
            opening_time: "09:00",
            closing_time: "17:00",
            visit_duration_minutes: 90,
          },
        ],
      },
    ],
  });

  it("labels unverified hotels, activities, and budget as AI-generated", () => {
    const marked = markCandidateSources(candidate);
    expect(marked.hotels[0].source_metadata?.source).toBe("AI_GENERATED");
    expect(marked.itinerary[0].activities[0].source_metadata?.source).toBe(
      "AI_GENERATED",
    );
    expect(marked.budget_source_metadata?.source).toBe("AI_GENERATED");
    expect(marked.itinerary[0].activities[0].travel_estimate_source).toBe(
      "ESTIMATED",
    );
  });

  it("does not trust client-provided verified metadata on saved trip plans", () => {
    const marked = markCandidateSources(candidate);
    const clientClaim = {
      ...marked,
      hotels: [
        {
          ...marked.hotels[0],
          source_metadata: {
            source: "VERIFIED" as const,
            provider: "forged",
            retrievedAt: new Date().toISOString(),
            placeId: "not-a-provider-validated-id",
            mapsUrl: "https://www.google.com/maps/place/not-a-real-place",
          },
        },
      ],
    };
    const saved = sanitizeSavedPlanSources(tripInfoSchema.parse(clientClaim));
    expect(saved.hotels[0].source_metadata).toMatchObject({
      source: "AI_GENERATED",
      provider: "user_saved",
    });
    expect(saved.hotels[0].source_metadata).not.toHaveProperty("mapsUrl");
    expect(saved.hotels[0].source_metadata).not.toHaveProperty("placeId");
  });

  it("only treats exact provider name matches as verified and degrades on provider errors", () => {
    const available: TravelProviderResult<
      Array<{
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
      }>
    > = {
      status: "available",
      data: [
        {
          id: "place-id",
          name: "Example Museum",
          address: "Verified address",
          latitude: 48.86,
          longitude: 2.34,
        },
      ],
      source: {
        source: "VERIFIED",
        provider: "google_places",
        retrievedAt: new Date().toISOString(),
      },
    };
    expect(verifiedPlaceMatch("Example Museum", available)?.id).toBe(
      "place-id",
    );
    expect(
      verifiedPlaceMatch("Example Museum Hotel", available),
    ).toBeUndefined();
    expect(
      verifiedPlaceMatch("Example Museum", {
        ...available,
        status: "error",
        data: [],
      }),
    ).toBeUndefined();
    expect(
      verifiedPlaceMatch("Example Museum", {
        ...available,
        status: "unavailable",
        data: [],
      }),
    ).toBeUndefined();
  });

  it("turns thrown travel-provider failures into an unavailable result", async () => {
    const result = await safelySearchPlaces("test-provider", async () => {
      throw new Error("provider internals must not escape");
    });
    expect(result.status).toBe("error");
    expect(result.data).toEqual([]);
    expect(result.source.source).toBe("UNAVAILABLE");
  });

  it("uses the unavailable adapter without credentials", () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    expect(getTravelDataProvider().name).toBe("unavailable");
    vi.unstubAllEnvs();
  });

  it("uses provider place results and turns provider timeouts into fallback status", async () => {
    const provider = createGooglePlacesProvider(
      "test-key",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              places: [
                {
                  id: "place-id",
                  displayName: { text: "Example Museum" },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ) as typeof fetch,
    );
    const result = await provider.searchPlaces("Example Museum, Paris");
    expect(result.status).toBe("available");
    expect(result.data[0]).toMatchObject({
      name: "Example Museum",
      id: "place-id",
    });
    expect(result.source.source).toBe("VERIFIED");

    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const timedProvider = createGooglePlacesProvider(
      "test-key",
      fetcher as typeof fetch,
    );
    const request = timedProvider.searchPlaces("Example Museum");
    const assertion = expect(request).resolves.toMatchObject({
      status: "error",
      data: [],
      source: { source: "UNAVAILABLE" },
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    vi.useRealTimers();
  });
});
