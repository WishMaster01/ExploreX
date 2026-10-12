import {
  haversineDistanceKm,
  isValidCoordinates,
  type Coordinates,
} from "../graph/haversine";

export type HotelCandidate = {
  rating: number;
  price_per_night: string;
  geo_coordinates: Coordinates;
  description?: string;
  amenities?: string[];
  source_metadata?: { source?: string };
};

export type HotelRankingWeights = {
  rating: number;
  budget: number;
  distance: number;
  amenities: number;
  reliability: number;
};
export const DEFAULT_HOTEL_WEIGHTS: HotelRankingWeights = {
  rating: 0.34,
  budget: 0.28,
  distance: 0.2,
  amenities: 0.1,
  reliability: 0.08,
};

export type RestaurantCandidate = {
  name: string;
  cuisine?: string;
  dietary?: string[];
  price?: number;
  rating?: number;
  distanceKm?: number;
  mealTypes?: string[];
  opening_time?: string;
  closing_time?: string;
  preferences?: string[];
  source_metadata?: { source?: string };
};

export type RestaurantRankingWeights = {
  preference: number;
  rating: number;
  price: number;
  distance: number;
  reliability: number;
};
export const DEFAULT_RESTAURANT_WEIGHTS: RestaurantRankingWeights = {
  preference: 0.3,
  rating: 0.25,
  price: 0.2,
  distance: 0.15,
  reliability: 0.1,
};

function normalizedWeights<T extends Record<string, number>>(weights: T): T {
  const total = Object.values(weights).reduce(
    (sum, weight) => sum + Math.max(0, weight),
    0,
  );
  if (!total) return weights;
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [
      key,
      Math.max(0, value) / total,
    ]),
  ) as T;
}

function reliability(source?: string): number {
  if (source === "VERIFIED") return 1;
  if (source === "USER_PROVIDED") return 0.7;
  if (source === "ESTIMATED") return 0.45;
  if (source === "AI_GENERATED") return 0.25;
  return 0.35;
}

export function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const matches = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  const values = matches.map(Number).filter(Number.isFinite);
  return values.reduce((sum, number) => sum + number, 0) / values.length;
}

export function rankHotels<T extends HotelCandidate>(
  hotels: T[],
  nightlyBudget: number,
  center?: Coordinates,
  preferences: {
    amenities?: string[];
    weights?: Partial<HotelRankingWeights>;
    clusterLabel?: string;
  } = {},
): Array<
  T & { recommendation_score: number; recommendation_reasons: string[] }
> {
  const weights = normalizedWeights({
    ...DEFAULT_HOTEL_WEIGHTS,
    ...preferences.weights,
  });
  return hotels
    .map((hotel) => {
      const price = parseMoney(hotel.price_per_night);
      const budgetMatch =
        nightlyBudget > 0 && price > 0
          ? Math.max(0, 1 - Math.abs(price - nightlyBudget) / nightlyBudget)
          : 0.5;
      const distance =
        center &&
        isValidCoordinates(center) &&
        isValidCoordinates(hotel.geo_coordinates)
          ? haversineDistanceKm(center, hotel.geo_coordinates)
          : 5;
      const distanceScore = 1 / (1 + distance / 5);
      const ratingScore = Math.min(1, Math.max(0, hotel.rating / 5));
      const listed = [
        ...(hotel.amenities ?? []),
        ...(hotel.description?.match(
          /pool|wifi|breakfast|transit|family|spa|central/gi,
        ) ?? []),
      ].map((item) => item.toLowerCase());
      const desired =
        preferences.amenities?.map((item) => item.toLowerCase()) ?? [];
      const amenityScore = desired.length
        ? desired.filter((item) =>
            listed.some((candidate) => candidate.includes(item)),
          ).length / desired.length
        : Math.min(1, listed.length / 4);
      const reliabilityScore = reliability(hotel.source_metadata?.source);
      const recommendation_score =
        ratingScore * weights.rating +
        budgetMatch * weights.budget +
        distanceScore * weights.distance +
        amenityScore * weights.amenities +
        reliabilityScore * weights.reliability;
      const reasons: string[] = [];
      if (nightlyBudget > 0 && price > 0 && price <= nightlyBudget)
        reasons.push(
          `${Math.round((1 - price / nightlyBudget) * 100)}% below your nightly budget`,
        );
      if (distance < 5)
        reasons.push(
          `within ${distance.toFixed(1)} km of ${preferences.clusterLabel ?? "your activity cluster"}`,
        );
      if (ratingScore >= 0.8)
        reasons.push(`rated ${hotel.rating.toFixed(1)} out of 5`);
      if (desired.length && amenityScore > 0)
        reasons.push(
          `matches ${Math.round(amenityScore * desired.length)} preferred amenity${amenityScore * desired.length === 1 ? "" : "ies"}`,
        );
      if (reliabilityScore < 0.5)
        reasons.push("details are estimated and should be checked");
      return {
        ...hotel,
        recommendation_score: Math.round(recommendation_score * 1000) / 1000,
        recommendation_reasons: reasons,
      };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);
}

export function rankRestaurants<T extends RestaurantCandidate>(
  restaurants: T[],
  options: {
    budget?: number;
    cuisine?: string[];
    dietary?: string[];
    mealType?: string;
    maxDistanceKm?: number;
    time?: string;
    weights?: Partial<RestaurantRankingWeights>;
  } = {},
): Array<
  T & { recommendation_score: number; recommendation_reasons: string[] }
> {
  const weights = normalizedWeights({
    ...DEFAULT_RESTAURANT_WEIGHTS,
    ...options.weights,
  });
  const requested = [
    ...(options.cuisine ?? []),
    ...(options.dietary ?? []),
  ].map((v) => v.toLowerCase());
  return restaurants
    .map((restaurant) => {
      const details =
        `${restaurant.cuisine ?? ""} ${(restaurant.dietary ?? []).join(" ")} ${(restaurant.preferences ?? []).join(" ")}`.toLowerCase();
      const preferenceScore = requested.length
        ? requested.filter((v) => details.includes(v)).length / requested.length
        : 0.5;
      const ratingScore = Math.max(
        0,
        Math.min(1, (restaurant.rating ?? 0) / 5),
      );
      const budgetScore =
        options.budget && options.budget > 0 && restaurant.price !== undefined
          ? restaurant.price <= options.budget
            ? 0.5 + 0.5 * (1 - restaurant.price / options.budget)
            : 0
          : 0.5;
      const distance = restaurant.distanceKm;
      const distanceScore =
        distance === undefined || options.maxDistanceKm === undefined
          ? 0.5
          : Math.max(0, 1 - distance / Math.max(0.1, options.maxDistanceKm));
      const reliabilityScore = reliability(restaurant.source_metadata?.source);
      const mealMatch =
        !options.mealType ||
        restaurant.mealTypes?.some(
          (m) => m.toLowerCase() === options.mealType?.toLowerCase(),
        )
          ? 1
          : 0;
      const combinedPreference = preferenceScore * 0.8 + mealMatch * 0.2;
      const score =
        combinedPreference * weights.preference +
        ratingScore * weights.rating +
        budgetScore * weights.price +
        distanceScore * weights.distance +
        reliabilityScore * weights.reliability;
      const reasons: string[] = [];
      if (requested.length && preferenceScore > 0)
        reasons.push("matches your cuisine or dietary preferences");
      if (options.mealType && mealMatch)
        reasons.push(`fits your ${options.mealType} meal`);
      if (
        options.budget &&
        restaurant.price !== undefined &&
        restaurant.price <= options.budget
      )
        reasons.push("within your meal budget");
      if (
        distance !== undefined &&
        options.maxDistanceKm !== undefined &&
        distance <= options.maxDistanceKm
      )
        reasons.push(`${distance.toFixed(1)} km away`);
      if (reliabilityScore < 0.5)
        reasons.push("details are estimates; confirm before visiting");
      return {
        ...restaurant,
        recommendation_score: Math.round(score * 1000) / 1000,
        recommendation_reasons: reasons,
      };
    })
    .filter((restaurant) => {
      if (options.time) {
        const time = clockValue(options.time);
        const opening = clockValue(restaurant.opening_time);
        const closing = clockValue(restaurant.closing_time);
        if (
          time !== undefined &&
          opening !== undefined &&
          closing !== undefined
        ) {
          const isOpen =
            closing < opening
              ? time >= opening || time <= closing
              : time >= opening && time <= closing;
          if (!isOpen) return false;
        } else if (
          (opening !== undefined || closing !== undefined) &&
          time !== undefined
        ) {
          if (opening !== undefined && time < opening) return false;
          if (closing !== undefined && time > closing) return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);
}

function clockValue(value?: string): number | undefined {
  const match = value?.match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}
