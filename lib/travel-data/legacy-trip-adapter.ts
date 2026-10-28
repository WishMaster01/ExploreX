import type { ValidTripInfo } from "@/lib/domain/schemas";
import type {
  Destination,
  Experience,
  Hotel as CanonicalHotel,
  ItineraryActivity,
  MoneyEstimate,
  Restaurant as CanonicalRestaurant,
  SourceMetadata,
} from "@/lib/domain/travel";
import {
  destinationSchema,
  experienceSchema,
  hotelSchema,
  itineraryActivitySchema,
  moneyEstimateSchema,
  restaurantSchema,
  sourceMetadataSchema,
} from "@/lib/domain/travel";
import { normalizePlaceName } from "./provider-name";
import { travelSourceTypes, type TravelSourceMetadata } from "./types";

function sourceFromLegacy(
  metadata: TravelSourceMetadata | undefined,
  fallback: SourceMetadata,
): SourceMetadata {
  if (!metadata) return sourceMetadataSchema.parse(fallback);
  const status =
    metadata.source === "USER_PROVIDED"
      ? "COMMUNITY_SUBMITTED"
      : travelSourceTypes.includes(metadata.source)
        ? metadata.source
        : "UNAVAILABLE";
  return sourceMetadataSchema.parse({
    status,
    provider: metadata.provider,
    retrievedAt: metadata.retrievedAt,
    ...(metadata.mapsUrl ? { attribution: metadata.mapsUrl } : {}),
    ...(metadata.note ? { note: metadata.note } : {}),
  });
}

function coordinatesFromLegacy(value: { latitude: number; longitude: number }) {
  return { latitude: value.latitude, longitude: value.longitude };
}

function estimate(
  amount: number | undefined,
  currencyCode: string | undefined,
  unit: MoneyEstimate["unit"],
  source: SourceMetadata,
): MoneyEstimate | undefined {
  if (amount === undefined || !currencyCode) return undefined;
  return moneyEstimateSchema.parse({ amount, currencyCode, unit, source });
}

export function destinationFromLegacyPlan(
  plan: Pick<ValidTripInfo, "destination">,
): Destination {
  const name = plan.destination.trim();
  return destinationSchema.parse({
    id: normalizePlaceName(name).replace(/\s+/g, "-").slice(0, 160),
    name,
    countryCode: "ZZ",
    source: {
      status: "AI_GENERATED",
      provider: "legacy-trip-plan",
      retrievedAt: null,
      note: "Legacy trip destination string; country and location were not independently resolved.",
    },
  });
}

export function canonicalHotelFromLegacy(
  hotel: ValidTripInfo["hotels"][number],
  destinationId: string,
  currencyCode?: string,
): CanonicalHotel {
  const source = sourceFromLegacy(hotel.source_metadata, {
    status: "AI_GENERATED",
    provider: "legacy-trip-plan",
    retrievedAt: null,
    note: "Legacy hotel candidate provenance was not provided.",
  });
  const numericPrice = Number(hotel.price_per_night.replace(/[^\d.]/g, ""));
  return hotelSchema.parse({
    id: normalizePlaceName(hotel.hotel_name).replace(/\s+/g, "-").slice(0, 200),
    name: hotel.hotel_name,
    destinationId,
    address: hotel.hotel_address,
    coordinates: coordinatesFromLegacy(hotel.geo_coordinates),
    imageUrl: hotel.hotel_image_url || undefined,
    pricePerNight:
      Number.isFinite(numericPrice) && numericPrice >= 0
        ? estimate(numericPrice, currencyCode, "per_night", source)
        : undefined,
    rating: hotel.rating,
    amenities: hotel.amenities ?? [],
    source,
  });
}

export function canonicalRestaurantFromLegacy(
  restaurant: NonNullable<ValidTripInfo["restaurants"]>[number],
  destinationId: string,
  currencyCode?: string,
): CanonicalRestaurant {
  const source = sourceFromLegacy(restaurant.source_metadata, {
    status: "AI_GENERATED",
    provider: "legacy-trip-plan",
    retrievedAt: null,
    note: "Legacy restaurant candidate provenance was not provided.",
  });
  const id = normalizePlaceName(restaurant.restaurant_name)
    .replace(/\s+/g, "-")
    .slice(0, 200);
  return restaurantSchema.parse({
    id,
    name: restaurant.restaurant_name,
    destinationId,
    ...(restaurant.address ? { address: restaurant.address } : {}),
    ...(restaurant.geo_coordinates
      ? { coordinates: coordinatesFromLegacy(restaurant.geo_coordinates) }
      : {}),
    cuisine: restaurant.cuisine,
    dietaryOptions: restaurant.dietary_tags ?? [],
    rating: restaurant.rating,
    price: estimate(
      restaurant.estimated_cost,
      currencyCode,
      "per_person",
      source,
    ),
    source,
  });
}

export function canonicalItineraryActivityFromLegacy(
  activity: ValidTripInfo["itinerary"][number]["activities"][number],
  dayNumber: number,
  position: number,
  destinationId: string,
  currencyCode?: string,
): ItineraryActivity {
  const source = sourceFromLegacy(activity.source_metadata, {
    status: "AI_GENERATED",
    provider: "legacy-trip-plan",
    retrievedAt: null,
    note: "Legacy itinerary candidate provenance was not provided.",
  });
  const experience: Experience = experienceSchema.parse({
    id: normalizePlaceName(activity.place_name)
      .replace(/\s+/g, "-")
      .slice(0, 200),
    name: activity.place_name,
    destinationId,
    address: activity.place_address,
    coordinates: coordinatesFromLegacy(activity.geo_coordinates),
    imageUrl: activity.place_image_url || undefined,
    category: "experience",
    description: activity.place_details,
    estimatedDurationMinutes: activity.visit_duration_minutes,
    price: estimate(
      activity.estimated_cost,
      currencyCode,
      "per_person",
      source,
    ),
    source,
  });
  return itineraryActivitySchema.parse({
    id: `${dayNumber}-${position}-${experience.id}`.slice(0, 200),
    dayNumber,
    position,
    experience,
    ...(activity.scheduled_start
      ? { scheduledStart: activity.scheduled_start }
      : {}),
    ...(activity.scheduled_end ? { scheduledEnd: activity.scheduled_end } : {}),
    source,
  });
}

export function canonicalPlanFromLegacy(plan: ValidTripInfo) {
  const destination = destinationFromLegacyPlan(plan);
  return {
    destination,
    hotels: plan.hotels.map((hotel) =>
      canonicalHotelFromLegacy(hotel, destination.id, plan.currency_code),
    ),
    restaurants: (plan.restaurants ?? []).map((restaurant) =>
      canonicalRestaurantFromLegacy(
        restaurant,
        destination.id,
        plan.currency_code,
      ),
    ),
    activities: plan.itinerary.flatMap((day) =>
      day.activities.map((activity, index) =>
        canonicalItineraryActivityFromLegacy(
          activity,
          day.day,
          index,
          destination.id,
          plan.currency_code,
        ),
      ),
    ),
  };
}
