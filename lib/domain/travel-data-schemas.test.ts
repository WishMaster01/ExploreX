import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import rawDestinationCatalog from "../../data/catalogs/destinations.json";
import rawTaxonomy from "../../data/catalogs/travel-taxonomy.json";
import rawSources from "../../data/catalogs/source-registry.json";
import { DESTINATIONS } from "../data/destinations";
import {
  travelDestinationCatalogSchema,
  travelDestinationManifestSchema,
  travelEventSchema,
  travelExperienceSchema,
  travelGuideSchema,
  travelHotelSchema,
  travelPlaceSchema,
  travelRestaurantSchema,
  travelRouteSchema,
  travelSourceRegistrySchema,
  travelTaxonomySchema,
} from "./travel-data-schemas";
import {
  applyTravelDataImportPlan,
  createTravelDataImportPlan,
  findLikelyDuplicateNames,
} from "../travel-data/import";

const needsReview = {
  status: "NEEDS_REVIEW" as const,
  provider: null,
  providerRecordId: null,
  sourceUrl: null,
  license: null,
  attribution: null,
  fetchedAt: null,
  lastVerifiedAt: null,
  verificationNotes: [
    "Synthetic schema-test fixture; not a real travel listing.",
  ],
};
const base = {
  id: "schema-fixture",
  destinationId: "jaipur-in",
  categoryIds: [],
  sourceRefs: [],
  verificationStatus: "NEEDS_REVIEW" as const,
  provenance: needsReview,
  lastVerifiedAt: null,
};

describe("canonical travel data contracts", () => {
  it("validates the complete destination catalog and preserves its geographic types", () => {
    const catalog = travelDestinationCatalogSchema.parse(rawDestinationCatalog);
    expect(catalog.destinations).toHaveLength(41);
    expect(DESTINATIONS).toHaveLength(catalog.destinations.length);
    expect(new Set(catalog.destinations.map(({ id }) => id)).size).toBe(
      catalog.destinations.length,
    );
    expect(
      catalog.destinations.find(({ id }) => id === "goa-india")
        ?.destinationType,
    ).toBe("region");
    expect(
      catalog.destinations.find(({ id }) => id === "bali-indonesia")
        ?.destinationType,
    ).toBe("island");
    expect(
      catalog.destinations.find(({ id }) => id === "maldives")?.destinationType,
    ).toBe("country");
    expect(
      catalog.destinations.find(({ id }) => id === "male-maldives")
        ?.coordinates,
    ).toEqual({ latitude: 4.1755, longitude: 73.5093 });
    expect(
      catalog.destinations.filter(({ status }) => status === "NEEDS_REVIEW"),
    ).toHaveLength(40);
    expect(
      travelDestinationCatalogSchema.safeParse({
        version: "1",
        destinations: [
          {
            ...catalog.destinations[0],
            coordinates: { latitude: 91, longitude: 0 },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates the 16-category taxonomy and the source registry", () => {
    const taxonomy = travelTaxonomySchema.parse(rawTaxonomy);
    const sourceRegistry = travelSourceRegistrySchema.parse(rawSources);
    expect(taxonomy.categories).toHaveLength(16);
    expect(taxonomy.categories.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "spiritual",
        "mountains",
        "beaches",
        "heritage",
        "culture",
        "wildlife",
        "adventure",
        "food",
        "hidden_gems",
        "weekend",
        "water",
        "desert",
        "ecotourism",
        "romantic_family",
        "budget_backpacking",
        "wellness",
      ]),
    );
    expect(taxonomy.tags.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["photography", "village_tourism", "workation"]),
    );
    expect(
      sourceRegistry.sources.filter(({ currentUse }) => currentUse === "used"),
    ).toHaveLength(5);
    expect(
      sourceRegistry.sources.filter(
        ({ currentUse }) => currentUse === "integrated_ephemeral",
      ),
    ).toHaveLength(2);
    expect(
      sourceRegistry.sources.filter(
        ({ currentUse }) => currentUse === "candidate_not_used",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("validates all Jaipur normalized records without fabricating unsupported categories", async () => {
    const root = process.cwd();
    const destination = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/destination.json"),
        "utf8",
      ),
    );
    const places = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/places.json"),
        "utf8",
      ),
    );
    const restaurants = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/restaurants.json"),
        "utf8",
      ),
    );
    const hotels = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/hotels.json"),
        "utf8",
      ),
    );
    const experiences = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/experiences.json"),
        "utf8",
      ),
    );
    const events = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/events.json"),
        "utf8",
      ),
    );
    const routes = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/routes.json"),
        "utf8",
      ),
    );
    const guide = JSON.parse(
      await readFile(
        path.join(root, "data/destinations/jaipur-in/travel-guide.json"),
        "utf8",
      ),
    );
    expect(
      travelDestinationCatalogSchema.safeParse({
        version: "1",
        destinations: [destination],
      }).success,
    ).toBe(true);
    expect(places).toHaveLength(4);
    expect(
      places.every(
        (record: unknown) => travelPlaceSchema.safeParse(record).success,
      ),
    ).toBe(true);
    expect(restaurants).toEqual([]);
    expect(hotels).toEqual([]);
    expect(experiences).toEqual([]);
    expect(events).toEqual([]);
    expect(routes).toEqual([]);
    expect(travelGuideSchema.safeParse(guide).success).toBe(true);
  });

  it("checks restaurant, hotel, experience, event, and route contracts", () => {
    expect(
      travelRestaurantSchema.safeParse({
        ...base,
        name: "Synthetic restaurant fixture",
        cuisineTags: [],
      }).success,
    ).toBe(true);
    expect(
      travelHotelSchema.safeParse({
        ...base,
        name: "Synthetic hotel fixture",
        accommodationType: "hotel",
        availability: "unknown",
      }).success,
    ).toBe(true);
    expect(
      travelExperienceSchema.safeParse({
        ...base,
        title: "Synthetic activity fixture",
        activityType: "other",
      }).success,
    ).toBe(true);
    const event = {
      ...base,
      title: "Synthetic event fixture",
      startsAt: null,
      endsAt: null,
      timeZone: "Asia/Kolkata",
      venueRef: null,
      organizer: null,
      eventStatus: "dates_unconfirmed",
    };
    expect(travelEventSchema.safeParse(event).success).toBe(true);
    expect(
      travelEventSchema.safeParse({ ...event, eventStatus: "confirmed" })
        .success,
    ).toBe(false);
    expect(
      travelEventSchema.safeParse({
        ...event,
        startsAt: "2026-11-02T00:00:00Z",
        endsAt: "2026-11-01T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      travelRouteSchema.safeParse({
        id: "route-fixture",
        originDestinationId: "jaipur-in",
        destinationDestinationId: "agra-india",
        provider: null,
        travelMode: "other",
        durationSeconds: null,
        distanceMeters: null,
        measurementType: "straight_line_estimate",
        retrievedAt: null,
        sourceRefs: [],
        attribution: null,
        verificationStatus: "ESTIMATED",
      }).success,
    ).toBe(true);
    expect(
      travelRouteSchema.safeParse({
        id: "fake-drive",
        originDestinationId: "jaipur-in",
        destinationDestinationId: "agra-india",
        provider: null,
        travelMode: "drive",
        durationSeconds: 50,
        distanceMeters: 20,
        measurementType: "straight_line_estimate",
        retrievedAt: null,
        sourceRefs: [],
        attribution: null,
        verificationStatus: "ESTIMATED",
      }).success,
    ).toBe(false);
  });

  it("validates every generated destination manifest and its record counts", async () => {
    const root = process.cwd();
    const catalog = travelDestinationCatalogSchema.parse(rawDestinationCatalog);
    for (const destination of catalog.destinations) {
      const directory = path.join(root, "data/destinations", destination.id);
      const manifest = JSON.parse(
        await readFile(path.join(directory, "manifest.json"), "utf8"),
      );
      expect(
        travelDestinationManifestSchema.safeParse(manifest).success,
        destination.id,
      ).toBe(true);
      for (const [type, file] of Object.entries({
        places: "places.json",
        restaurants: "restaurants.json",
        hotels: "hotels.json",
        experiences: "experiences.json",
        events: "events.json",
        routes: "routes.json",
      })) {
        const rows = JSON.parse(
          await readFile(path.join(directory, file), "utf8"),
        );
        expect(manifest.recordCounts[type], `${destination.id}/${type}`).toBe(
          rows.length,
        );
      }
    }
  });

  it("creates stable idempotent import keys and uses conflict-safe upserts", async () => {
    const firstPlan = createTravelDataImportPlan([
      { key: "travel:fixture", content: { value: 1 } },
    ]);
    const secondPlan = createTravelDataImportPlan([
      { key: "travel:fixture", content: { value: 1 } },
    ]);
    expect(secondPlan).toEqual(firstPlan);
    expect(() =>
      createTravelDataImportPlan([
        { key: "same", content: 1 },
        { key: "same", content: 2 },
      ]),
    ).toThrow("Duplicate dataset import key");
    const stored = new Map<string, unknown>();
    const query = async (sql: string, values: unknown[]) => {
      expect(sql).toContain('ON CONFLICT ("key") DO UPDATE');
      stored.set(String(values[0]), JSON.parse(String(values[1])));
    };
    await applyTravelDataImportPlan(query, firstPlan);
    await applyTravelDataImportPlan(query, secondPlan);
    expect(stored.size).toBe(1);
    expect(stored.get("travel:fixture")).toEqual({ value: 1 });
  });

  it("detects likely duplicate names after accent and punctuation normalization", () => {
    expect(
      findLikelyDuplicateNames([
        { id: "one", name: "Hawa Mahal" },
        { id: "two", name: "Hawa-Mahal" },
        { id: "three", name: "Hawá Mahal" },
      ]),
    ).toEqual([
      { id: "two", normalizedName: "hawa mahal" },
      { id: "three", normalizedName: "hawa mahal" },
    ]);
  });
});
