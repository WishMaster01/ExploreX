import { describe, expect, it } from "vitest";
import { z } from "zod";
import { selectWithinBudget } from "./budget/knapsack";
import { LruTtlCache } from "./cache/lru-ttl-cache";
import { optimizeRoute } from "./graph/route-optimizer";
import { SlidingWindowRateLimiter } from "./rate-limit/sliding-window";
import { rankHotels } from "./recommendation/weighted-scoring";
import { scheduleActivities } from "./scheduling/itinerary-scheduler";
import { fuzzySearch } from "./search/fuzzy-search";
import { levenshteinDistance } from "./search/levenshtein";
import { Trie } from "./search/trie";
import { safeJsonParse } from "./validation/safe-json-parser";

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
