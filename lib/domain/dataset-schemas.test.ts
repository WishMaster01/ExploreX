import { describe, expect, it } from "vitest";
import destination from "../../data/destinations/jaipur.json";
import places from "../../data/places/jaipur.json";
import restaurants from "../../data/restaurants/jaipur.json";
import hotels from "../../data/hotels/jaipur.json";
import experiences from "../../data/experiences/jaipur.json";
import guide from "../../data/travel-guides/jaipur.json";
import taxonomyData from "../../data/taxonomy/categories.json";
import manifest from "../../data/manifests/jaipur.json";
import {
  datasetDestinationSchema,
  datasetExperienceSchema,
  datasetGuideSchema,
  datasetHotelSchema,
  datasetManifestSchema,
  datasetPlaceSchema,
  datasetRestaurantSchema,
  jaipurCatalogSchema,
  taxonomySchema,
  unmanifestedEvidenceReferences,
  unknownCategoryReferences,
} from "./dataset-schemas";

describe("Jaipur travel catalog", () => {
  it("validates all checked-in data records and the licensing manifest", () => {
    expect(datasetDestinationSchema.safeParse(destination).success).toBe(true);
    expect(
      places.every((record) => datasetPlaceSchema.safeParse(record).success),
    ).toBe(true);
    expect(
      restaurants.every(
        (record) => datasetRestaurantSchema.safeParse(record).success,
      ),
    ).toBe(true);
    expect(
      hotels.every((record) => datasetHotelSchema.safeParse(record).success),
    ).toBe(true);
    expect(
      experiences.every(
        (record) => datasetExperienceSchema.safeParse(record).success,
      ),
    ).toBe(true);
    expect(datasetGuideSchema.safeParse(guide).success).toBe(true);
    expect(datasetManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it("supports the requested category range and valid multi-category references", () => {
    const taxonomy = taxonomySchema.parse(taxonomyData);
    expect(taxonomy.categories.length).toBeGreaterThanOrEqual(18);
    const catalog = jaipurCatalogSchema.parse({
      destination,
      places,
      restaurants,
      hotels,
      experiences,
      travelGuide: guide,
    });
    expect(unknownCategoryReferences(catalog, taxonomy)).toEqual([]);
    expect(new Set(destination.categories).size).toBeGreaterThan(1);
    expect(
      unmanifestedEvidenceReferences(
        catalog,
        datasetManifestSchema.parse(manifest),
      ),
    ).toEqual([]);
  });

  it("rejects provenance that conflicts with the factual verification status", () => {
    const inconsistent = {
      ...places[0],
      verificationStatus: "VERIFIED",
    };
    expect(datasetPlaceSchema.safeParse(inconsistent).success).toBe(false);
  });

  it("keeps unsupported inventory empty instead of inventing records or zero prices", () => {
    expect(restaurants).toEqual([]);
    expect(hotels).toEqual([]);
    expect(experiences).toEqual([]);
    expect(places.every((place) => !("coordinates" in place))).toBe(true);
  });
});
