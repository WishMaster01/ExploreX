import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allocateTripBudget, selectWithinBudget } from "./budget/knapsack";
import { LruTtlCache } from "./cache/lru-ttl-cache";
import { optimizeRoute } from "./graph/route-optimizer";
import { SlidingWindowRateLimiter } from "./rate-limit/sliding-window";
import { rankHotels, rankRestaurants } from "./recommendation/weighted-scoring";
import {
  scheduleActivities,
  scheduleFeasibleActivities,
} from "./scheduling/itinerary-scheduler";
import { fuzzySearch } from "./search/fuzzy-search";
import { levenshteinDistance } from "./search/levenshtein";
import { Trie } from "./search/trie";
import { safeJsonParse } from "./validation/safe-json-parser";
import { isValidCoordinates } from "./graph/haversine";
import {
  parseDestinationSearchQuery,
  parseTripListQuery,
  parseWeatherQueryParams,
  tripPreferenceSchema,
} from "../domain/schemas";
import {
  isAdminIdentity,
  ownedReminderWhere,
  ownedTripWhere,
} from "../domain/ownership";
import { tripInfoSchema } from "../ai-schemas";
import { optimizeTripPlan } from "../trip-optimizer";

function activity(
  name: string,
  latitude = 35.6,
  longitude = 139.7,
  extra: Record<string, unknown> = {},
) {
  return {
    place_name: name,
    place_details: `${name} visitor experience`,
    place_image_url: "",
    geo_coordinates: { latitude, longitude },
    place_address: "Tokyo",
    ticket_pricing: "1000",
    estimated_cost: 1000,
    time_travel_each_location: "",
    best_time_to_visit: "flexible",
    ...extra,
  };
}

function plan(
  duration: string,
  itinerary: Array<{
    day: number;
    day_plan: string;
    best_time_to_visit_day: string;
    activities: ReturnType<typeof activity>[];
  }>,
  budget = "100000",
) {
  return tripInfoSchema.parse({
    destination: "Tokyo",
    origin: "Delhi",
    duration,
    budget,
    group_size: "2 people",
    currency_code: "JPY",
    hotels: [],
    itinerary,
  });
}

describe("destination search", () => {
  it("supports prefix lookup and typo-tolerant matching", () => {
    const trie = new Trie(["Mumbai", "Munich", "Delhi"]);
    expect(trie.search("Mum")).toContain("Mumbai");
    expect(levenshteinDistance("Mumabi", "Mumbai")).toBe(2);
    expect(
      fuzzySearch("Mumabi", [{ label: "Mumbai" }, { label: "Delhi" }])[0].label,
    ).toBe("Mumbai");
  });
});

describe("route optimization", () => {
  it("does not make a coordinate route longer", () => {
    const points = [
      { name: "far", geo_coordinates: { latitude: 0, longitude: 3 } },
      { name: "near", geo_coordinates: { latitude: 0, longitude: 1 } },
      { name: "middle", geo_coordinates: { latitude: 0, longitude: 2 } },
    ];
    const result = optimizeRoute(points, { latitude: 0, longitude: 0 });
    expect(result.items.map((point) => point.name)).toEqual([
      "near",
      "middle",
      "far",
    ]);
    expect(result.savedDistanceKm).toBeGreaterThan(0);
    expect(result.distanceSource).toBe("STRAIGHT_LINE_ESTIMATE");
  });

  it("uses provider distances only when the provider returns a distance", () => {
    const points = [
      { name: "a", geo_coordinates: { latitude: 0, longitude: 0 } },
      { name: "b", geo_coordinates: { latitude: 0, longitude: 1 } },
    ];
    const provider = optimizeRoute(points, undefined, {
      distanceBetween: () => 4,
    });
    const fallback = optimizeRoute(points, undefined, {
      distanceBetween: () => undefined,
    });
    expect(provider.distanceSource).toBe("PROVIDER_ROUTE");
    expect(provider.totalDistanceKm).toBe(4);
    expect(fallback.distanceSource).toBe("STRAIGHT_LINE_ESTIMATE");
    expect(fallback.totalDistanceKm).toBeGreaterThan(100);
    const mixed = optimizeRoute(
      [
        ...points,
        { name: "c", geo_coordinates: { latitude: 0, longitude: 2 } },
      ],
      undefined,
      {
        distanceBetween: (from, to) =>
          "geo_coordinates" in from && "geo_coordinates" in to ? 4 : undefined,
      },
    );
    expect(mixed.distanceSource).toBe("MIXED_ESTIMATE");
  });

  it("keeps activities with missing coordinates and reports a zero known route", () => {
    const result = optimizeRoute([
      { name: "unknown", geo_coordinates: null as never },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.distanceSource).toBe("UNAVAILABLE");
  });
});

describe("budget optimization", () => {
  it("maximizes value without exceeding the budget", () => {
    const result = selectWithinBudget(
      [
        { item: "museum", cost: 50, value: 8 },
        { item: "tour", cost: 60, value: 9 },
        { item: "show", cost: 100, value: 12 },
      ],
      110,
      1,
    );
    expect(result.selected).toEqual(["museum", "tour"]);
    expect(result.cost).toBeLessThanOrEqual(110);
  });

  it("handles zero and extremely high budgets with bounded allocation", () => {
    expect(
      selectWithinBudget([{ item: "entry", cost: 10, value: 1 }], 0).selected,
    ).toEqual([]);
    const high = selectWithinBudget(
      [{ item: "entry", cost: 10, value: 1 }],
      1e12,
    );
    expect(high.selected).toContain("entry");
    const zero = allocateTripBudget(0, 1);
    const allocation = allocateTripBudget(100_000, 30, 5, "premium culinary");
    expect(Object.values(zero).every((amount) => amount === 0)).toBe(true);
    expect(
      Object.values(allocation).reduce((sum, amount) => sum + amount, 0),
    ).toBeCloseTo(100_000);
    expect(allocation.accommodation).toBeGreaterThan(0);
    expect(allocation.emergency).toBeGreaterThan(0);
    expect(
      allocateTripBudget(100_000, 5, 1, "budget").accommodation,
    ).toBeLessThan(allocation.accommodation);
  });
});

describe("itinerary scheduling", () => {
  it("allocates non-overlapping time slots", () => {
    const scheduled = scheduleActivities(
      [
        { best_time_to_visit: "morning", visit_duration_minutes: 90 },
        { best_time_to_visit: "morning", visit_duration_minutes: 60 },
      ],
      20,
    );
    expect(scheduled[0].scheduled_end < scheduled[1].scheduled_start).toBe(
      true,
    );
  });

  it("respects reservations and unavailable periods", () => {
    const result = scheduleFeasibleActivities([
      {
        reservation_time: "11:00",
        opening_time: "09:00",
        closing_time: "18:00",
        visit_duration_minutes: 60,
        unavailable_periods: [{ start: "10:30", end: "11:30" }],
      },
    ]);
    expect(result.removed).toHaveLength(0);
    expect(result.scheduled[0].scheduled_start).toBe("11:30");
  });

  it("removes conflicting, over-limit, and over-capacity visits instead of scheduling them impossibly", () => {
    const conflict = scheduleFeasibleActivities([
      {
        opening_time: "09:00",
        closing_time: "10:00",
        visit_duration_minutes: 120,
      },
    ]);
    const distance = scheduleFeasibleActivities([
      { estimated_travel_time_minutes: 25, max_travel_time_minutes: 10 },
    ]);
    const crowded = scheduleFeasibleActivities(
      Array.from({ length: 30 }, () => ({ visit_duration_minutes: 90 })),
    );
    expect(conflict.scheduled).toHaveLength(0);
    expect(conflict.removed).toHaveLength(1);
    expect(distance.scheduled).toHaveLength(0);
    expect(crowded.scheduled.length).toBeLessThan(30);
    expect(crowded.removed.length).toBeGreaterThan(0);
  });

  it("uses provider travel time when available and labels derived time as estimated otherwise", () => {
    expect(
      scheduleFeasibleActivities([
        { travel_time_minutes: 7, max_travel_time_minutes: 10 },
      ]).scheduled,
    ).toHaveLength(1);
    expect(
      scheduleFeasibleActivities([
        { travel_time_minutes: 25, max_travel_time_minutes: 10 },
      ]).scheduled,
    ).toHaveLength(0);
    expect(
      scheduleFeasibleActivities([
        { estimated_travel_time_minutes: 25, max_travel_time_minutes: 10 },
      ]).scheduled,
    ).toHaveLength(0);
  });
});

describe("recommendation ranking", () => {
  it("balances rating and budget match", () => {
    const hotels = rankHotels(
      [
        {
          name: "best fit",
          rating: 4.8,
          price_per_night: "$100",
          geo_coordinates: { latitude: 1, longitude: 1 },
        },
        {
          name: "poor fit",
          rating: 3.2,
          price_per_night: "$400",
          geo_coordinates: { latitude: 1, longitude: 1 },
        },
      ],
      100,
      { latitude: 1, longitude: 1 },
    );
    expect(hotels[0].name).toBe("best fit");
  });

  it("ranks dedicated restaurant candidates by dietary fit, meal, distance, and source", () => {
    const restaurants = rankRestaurants(
      [
        {
          name: "Near vegan lunch",
          cuisine: "Japanese",
          dietary: ["vegan"],
          mealTypes: ["lunch"],
          price: 15,
          rating: 4.5,
          distanceKm: 1,
          source_metadata: { source: "VERIFIED" },
        },
        {
          name: "Far steakhouse",
          cuisine: "steak",
          dietary: [],
          mealTypes: ["dinner"],
          price: 30,
          rating: 4.8,
          distanceKm: 8,
          source_metadata: { source: "AI_GENERATED" },
        },
      ],
      {
        cuisine: ["Japanese"],
        dietary: ["vegan"],
        mealType: "lunch",
        budget: 20,
        maxDistanceKm: 5,
      },
    );
    expect(restaurants[0].name).toBe("Near vegan lunch");
    expect(restaurants[0].recommendation_reasons.length).toBeGreaterThan(0);
  });
});

describe("trip optimization edge cases", () => {
  it("optimizes one-day and 30-day trips, including an empty schedule and absent hotel or restaurant data", () => {
    const oneDay = optimizeTripPlan(
      plan("1 day", [
        {
          day: 1,
          day_plan: "Tokyo",
          best_time_to_visit_day: "flexible",
          activities: [activity("Temple")],
        },
      ]),
    );
    const thirtyDays = optimizeTripPlan(
      plan(
        "30 days",
        Array.from({ length: 30 }, (_, i) => ({
          day: i + 1,
          day_plan: `Day ${i + 1}`,
          best_time_to_visit_day: "flexible",
          activities: [activity(`Stop ${i + 1}`, 35.6, 139.7 + i * 0.001)],
        })),
      ),
    );
    const empty = optimizeTripPlan(
      plan("1 day", [
        {
          day: 1,
          day_plan: "Rest",
          best_time_to_visit_day: "flexible",
          activities: [],
        },
      ]),
    );
    expect(oneDay.itinerary[0].activities).toHaveLength(1);
    expect(thirtyDays.itinerary).toHaveLength(30);
    expect(empty.itinerary[0].activities).toHaveLength(0);
    expect(empty.optimization?.distance_source).toBe("UNAVAILABLE");
    expect(oneDay.hotels).toHaveLength(0);
    expect(oneDay.restaurants).toBeUndefined();
    expect(oneDay.optimization?.quality_score).toBeGreaterThanOrEqual(0);
  });

  it("removes activities outside trip dates and obeys a zero budget", () => {
    const dated = tripInfoSchema.parse({
      destination: "Tokyo",
      origin: "Delhi",
      duration: "2 days",
      start_date: "2026-10-12",
      end_date: "2026-10-13",
      budget: "0",
      group_size: "solo",
      hotels: [],
      itinerary: Array.from({ length: 3 }, (_, i) => ({
        day: i + 1,
        day_plan: `Day ${i + 1}`,
        best_time_to_visit_day: "flexible",
        activities: [activity(`Stop ${i + 1}`)],
      })),
    });
    const result = optimizeTripPlan(dated);
    expect(result.itinerary).toHaveLength(2);
    expect(result.optimization?.budget_activity_names).toEqual([]);
    expect(
      result.optimization?.decision_reasons?.some((reason) =>
        reason.includes("outside the trip dates"),
      ),
    ).toBe(true);
    expect(
      tripInfoSchema.safeParse({
        destination: "Tokyo",
        origin: "Delhi",
        duration: "2 days",
        start_date: "2026-10-14",
        end_date: "2026-10-13",
        budget: "0",
        group_size: "solo",
        hotels: [],
        itinerary: [],
      }).success,
    ).toBe(false);
  });

  it("uses supplied provider duration for maximum-travel-time constraints", () => {
    const input = plan("1 day", [
      {
        day: 1,
        day_plan: "Tokyo",
        best_time_to_visit_day: "flexible",
        activities: [
          activity("A"),
          activity("B", 35.61, 139.71, { max_travel_time_minutes: 10 }),
        ],
      },
    ]);
    const providerTime = optimizeTripPlan(input, {
      distanceBetweenKm: () => 1,
      travelTimeBetweenMinutes: () => 7,
    });
    const overLimit = optimizeTripPlan(input, {
      distanceBetweenKm: () => 1,
      travelTimeBetweenMinutes: () => 25,
    });
    expect(providerTime.itinerary[0].activities).toHaveLength(2);
    expect(providerTime.itinerary[0].activities[1].travel_time_minutes).toBe(7);
    expect(providerTime.itinerary[0].activities[1].travel_estimate_source).toBe(
      "VERIFIED",
    );
    expect(overLimit.itinerary[0].activities).toHaveLength(1);
    expect(overLimit.optimization?.distance_source).toBe("PROVIDER_ROUTE");
  });
});

describe("rate limiting", () => {
  it("enforces a sliding-window quota", () => {
    const limiter = new SlidingWindowRateLimiter();
    expect(limiter.check("user", 2, 60_000).allowed).toBe(true);
    expect(limiter.check("user", 2, 60_000).allowed).toBe(true);
    expect(limiter.check("user", 2, 60_000).allowed).toBe(false);
  });
});

describe("LRU TTL cache", () => {
  it("evicts the least recently used value", async () => {
    const cache = new LruTtlCache<number>(2, 60_000);
    await cache.set("a", 1);
    await cache.set("b", 2);
    await cache.get("a");
    await cache.set("c", 3);
    expect(await cache.get("a")).toBe(1);
    expect(await cache.get("b")).toBeUndefined();
  });
});

describe("safe AI JSON parsing", () => {
  it("extracts fenced JSON and validates its schema", () => {
    const result = safeJsonParse(
      '```json\n{"ok":true}\n```',
      z.object({ ok: z.boolean() }),
    );
    expect(result.data).toEqual({ ok: true });
  });

  it("rejects malformed response shapes", () => {
    const result = safeJsonParse('{"ok":"yes"}', z.object({ ok: z.boolean() }));
    expect(result.error).toBeTruthy();
  });
});

describe("shared domain validation", () => {
  it("accepts valid trip preferences and rejects out-of-range fields", () => {
    const valid = {
      origin: "Delhi",
      destination: "Tokyo",
      group_size: "Couple",
      budget: "Standard",
      duration: "5 days",
      interests: ["food", "culture"],
    };
    expect(tripPreferenceSchema.safeParse(valid).success).toBe(true);
    expect(
      tripPreferenceSchema.safeParse({ ...valid, destination: "" }).success,
    ).toBe(false);
    expect(
      tripPreferenceSchema.safeParse({
        ...valid,
        currency_code: "JPY",
        travel_style: "slow travel",
        start_date: "2027-04-10",
        end_date: "2027-04-15",
        accommodation: "Near public transit",
        food_preferences: "Vegetarian",
        transport_preferences: "Train",
        walking_tolerance: "low",
      }).success,
    ).toBe(true);
    expect(
      tripPreferenceSchema.safeParse({
        ...valid,
        start_date: "2027-04-15",
        end_date: "2027-04-10",
      }).success,
    ).toBe(false);
    expect(
      tripPreferenceSchema.safeParse({
        ...valid,
        start_date: "2027-04-15",
      }).success,
    ).toBe(false);
  });

  it("narrows coordinate input without accepting invalid values", () => {
    expect(isValidCoordinates({ latitude: 35.6, longitude: 139.7 })).toBe(true);
    expect(isValidCoordinates({ latitude: 95, longitude: 139.7 })).toBe(false);
    expect(isValidCoordinates(null)).toBe(false);
  });

  it("rejects duplicate normalized itinerary day numbers", () => {
    const day = {
      day: 1,
      day_plan: "Walk the old town",
      best_time_to_visit_day: "morning",
      activities: [],
    };
    expect(
      tripInfoSchema.safeParse({
        destination: "Tokyo",
        currency_code: "JPY",
        duration: "2 days",
        origin: "Delhi",
        budget: "100000",
        group_size: "Couple",
        hotels: [],
        itinerary: [day, day],
      }).success,
    ).toBe(false);
  });

  it("rejects malformed and duplicate query parameters", () => {
    expect(parseTripListQuery(new URLSearchParams("limit=31"))).toBeNull();
    expect(parseTripListQuery(new URLSearchParams("sort=unknown"))).toBeNull();
    expect(
      parseTripListQuery(new URLSearchParams("limit=3&limit=4")),
    ).toBeNull();
    expect(
      parseDestinationSearchQuery(new URLSearchParams("q=Tokyo&q=Paris")),
    ).toBeNull();
  });

  it("bounds weather coordinates and rejects ambiguous or duplicate parameters", () => {
    expect(
      parseWeatherQueryParams(new URLSearchParams("lat=40.7&lon=-74")),
    ).toEqual({
      lat: 40.7,
      lon: -74,
    });
    expect(parseWeatherQueryParams(new URLSearchParams("city=Tokyo"))).toEqual({
      city: "Tokyo",
    });
    expect(
      parseWeatherQueryParams(new URLSearchParams("lat=91&lon=0")),
    ).toBeNull();
    expect(
      parseWeatherQueryParams(new URLSearchParams("lat=1&lon=2&city=Tokyo")),
    ).toBeNull();
    expect(
      parseWeatherQueryParams(new URLSearchParams("lat=1&lat=2&lon=2")),
    ).toBeNull();
    expect(
      parseWeatherQueryParams(
        new URLSearchParams("lat=1&lon=2&url=http://evil"),
      ),
    ).toBeNull();
  });
});

describe("ownership and admin authorization", () => {
  it("scopes a resource lookup to the authenticated owner", () => {
    const tripFilter = ownedTripWhere("user-a", "trip-b");
    const reminderFilter = ownedReminderWhere("user-a", "reminder-b");
    const userBTrip = { id: "trip-b", userId: "user-b" };
    const userBReminder = { id: "reminder-b", userId: "user-b" };

    expect(tripFilter).toEqual({ id: "trip-b", userId: "user-a" });
    expect(reminderFilter).toEqual({ id: "reminder-b", userId: "user-a" });
    expect(tripFilter.userId === userBTrip.userId).toBe(false);
    expect(reminderFilter.userId === userBReminder.userId).toBe(false);
  });

  it("does not authorize a regular user for admin access", () => {
    expect(
      isAdminIdentity(
        { clerkUserId: "clerk-user", email: "user@example.com", role: "user" },
        [],
      ),
    ).toBe(false);
    expect(
      isAdminIdentity(
        { clerkUserId: null, email: "admin@example.com", role: "user" },
        ["ADMIN@example.com"],
      ),
    ).toBe(true);
    expect(
      isAdminIdentity(
        { clerkUserId: null, email: "admin@example.com", role: "ADMIN" },
        [],
      ),
    ).toBe(true);
  });
});
