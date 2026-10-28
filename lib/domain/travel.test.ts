import { describe, expect, it } from "vitest";
import {
  discoverySchema,
  hotelSchema,
  itineraryActivitySchema,
  moneyEstimateSchema,
  sourceMetadataSchema,
} from "./travel";
import { canonicalPlanFromLegacy } from "@/lib/travel-data/legacy-trip-adapter";
import type { ValidTripInfo } from "./schemas";

const estimatedSource = {
  status: "ESTIMATED",
  provider: null,
  retrievedAt: null,
  note: "Planning estimate",
} as const;

describe("canonical travel contracts", () => {
  it("accepts explicit estimated INR prices", () => {
    expect(
      moneyEstimateSchema.parse({
        amount: 1250,
        currencyCode: "INR",
        unit: "per_person",
        source: estimatedSource,
      }).currencyCode,
    ).toBe("INR");
  });

  it("rejects invalid provenance states and reversed freshness windows", () => {
    expect(
      sourceMetadataSchema.safeParse({
        status: "LIVE",
        provider: "test",
        retrievedAt: null,
      }).success,
    ).toBe(false);
    expect(
      sourceMetadataSchema.safeParse({
        status: "PROVIDER_SOURCED",
        provider: "catalog",
        retrievedAt: "2026-10-27T12:00:00Z",
        validUntil: "2026-10-26T12:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("checks event interval ordering", () => {
    expect(
      discoverySchema.safeParse({
        id: "event-1",
        destinationId: "jaipur",
        title: "Festival",
        category: "event",
        startsAt: "2026-11-02T00:00:00Z",
        endsAt: "2026-11-01T00:00:00Z",
        source: estimatedSource,
      }).success,
    ).toBe(false);
  });

  it("keeps hotel identity and price independently sourced", () => {
    const hotel = hotelSchema.parse({
      id: "hotel-123",
      name: "Example stay",
      destinationId: "goa",
      source: { ...estimatedSource, status: "AI_GENERATED" },
      pricePerNight: {
        amount: 5000,
        currencyCode: "INR",
        unit: "per_night",
        source: estimatedSource,
      },
    });
    expect(hotel.source.status).toBe("AI_GENERATED");
    expect(hotel.pricePerNight?.source.status).toBe("ESTIMATED");
  });

  it("validates a canonical scheduled itinerary activity", () => {
    const activity = itineraryActivitySchema.parse({
      id: "day1-stop1",
      dayNumber: 1,
      position: 0,
      experience: {
        id: "fort-jaipur",
        name: "Amber Fort",
        destinationId: "jaipur",
        category: "heritage",
        source: estimatedSource,
      },
      scheduledStart: "09:00",
      source: estimatedSource,
    });
    expect(activity.position).toBe(0);
  });

  it("adapts a legacy plan without guessing a country or currency", () => {
    const plan: ValidTripInfo = {
      destination: "Jaipur, Rajasthan, India",
      duration: "3 days",
      origin: "Delhi",
      budget: "₹15,000",
      group_size: "2 people",
      hotels: [
        {
          hotel_name: "Example stay",
          hotel_address: "Jaipur",
          price_per_night: "₹5,000",
          hotel_image_url: "",
          geo_coordinates: { latitude: 26.9, longitude: 75.8 },
          rating: 4,
          description: "Candidate",
        },
      ],
      itinerary: [],
    };
    const canonical = canonicalPlanFromLegacy(plan);
    expect(canonical.destination.countryCode).toBe("ZZ");
    expect(canonical.hotels[0].pricePerNight).toBeUndefined();
    expect(canonical.hotels[0].source.status).toBe("AI_GENERATED");
  });
});
