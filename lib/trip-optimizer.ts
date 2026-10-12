import {
  allocateTripBudget,
  selectWithinBudget,
} from "./algorithms/budget/knapsack";
import {
  haversineDistanceKm,
  isValidCoordinates,
} from "./algorithms/graph/haversine";
import {
  optimizeRoute,
  type RouteDistanceSource,
} from "./algorithms/graph/route-optimizer";
import {
  parseMoney,
  rankHotels,
  rankRestaurants,
} from "./algorithms/recommendation/weighted-scoring";
import { scheduleFeasibleActivities } from "./algorithms/scheduling/itinerary-scheduler";
import type { ValidTripInfo } from "./domain/schemas";

function durationDays(value: string): number {
  return Math.max(1, Math.min(365, Number(value.match(/\d+/)?.[0] ?? 1)));
}

function partySize(value: string): number {
  if (/couple|two people|pair/i.test(value)) return 2;
  if (/family/i.test(value)) return 4;
  const n = Number(value.match(/\d+/)?.[0] ?? 1);
  return Math.max(1, Math.min(100, n));
}

function quality(
  trip: ValidTripInfo,
  feasible: number,
  proposed: number,
  km: number,
  budget: number,
  modeledSpend: number,
  plannedDays: number,
  plannedItinerary: ValidTripInfo["itinerary"],
) {
  const constraint =
    proposed === 0 ? 100 : Math.round((feasible / proposed) * 100);
  const days = Math.max(1, plannedDays);
  const stopsPerDay = feasible / days;
  const density =
    proposed === 0
      ? 100
      : Math.round(Math.max(0, 100 - Math.abs(stopsPerDay - 3) * 18));
  const distancePerStop = feasible ? km / feasible : 0;
  const travel =
    feasible === 0 ? 100 : Math.round(Math.max(0, 100 - distancePerStop * 3));
  const budgetFit =
    budget <= 0
      ? modeledSpend <= 0
        ? 100
        : 0
      : modeledSpend <= 0
        ? 50
        : Math.round(Math.min(100, (budget / modeledSpend) * 100));
  const preferenceTerms = [
    ...(trip.interests ?? []),
    ...(trip.cuisine_preferences ?? []),
    ...(trip.dietary_preferences ?? []),
  ];
  const allText = plannedItinerary
    .flatMap((day) =>
      day.activities.map((activity) =>
        `${activity.place_name} ${activity.place_details}`.toLowerCase(),
      ),
    )
    .join(" ");
  const preferenceMatch = preferenceTerms.length
    ? Math.round(
        (preferenceTerms.filter((term) => allText.includes(term.toLowerCase()))
          .length /
          preferenceTerms.length) *
          100,
      )
    : 100;
  const dimensions = {
    constraint_satisfaction: constraint,
    travel_efficiency: travel,
    budget_fit: budgetFit,
    preference_match: preferenceMatch,
    schedule_density: density,
  };
  return {
    dimensions,
    score: Math.round(
      Object.values(dimensions).reduce((sum, value) => sum + value, 0) /
        Object.keys(dimensions).length,
    ),
  };
}

export function optimizeTripPlan(
  trip: ValidTripInfo,
  routing?: {
    distanceBetweenKm: (
      from: { latitude: number; longitude: number },
      to: { latitude: number; longitude: number },
    ) => number | undefined;
    travelTimeBetweenMinutes?: (
      from: { latitude: number; longitude: number },
      to: { latitude: number; longitude: number },
    ) => number | undefined;
    source?: RouteDistanceSource;
  },
): ValidTripInfo {
  const dateDays =
    trip.start_date && trip.end_date
      ? Math.floor(
          (Date.parse(`${trip.end_date}T00:00:00Z`) -
            Date.parse(`${trip.start_date}T00:00:00Z`)) /
            86_400_000,
        ) + 1
      : undefined;
  const days = Math.max(
    1,
    Math.min(365, dateDays ?? durationDays(trip.duration)),
  );
  const totalBudget = parseMoney(trip.budget);
  const allocation = allocateTripBudget(
    totalBudget,
    days,
    partySize(trip.group_size),
    trip.travel_style ?? "standard",
  );
  const nightlyBudget = allocation.accommodation / days;
  const allActivities = trip.itinerary
    .slice(0, days)
    .flatMap((day) => day.activities);
  const locatedActivities = allActivities.filter((activity) =>
    isValidCoordinates(activity.geo_coordinates),
  );
  const center = locatedActivities.length
    ? {
        latitude:
          locatedActivities.reduce(
            (sum, activity) => sum + activity.geo_coordinates.latitude,
            0,
          ) / locatedActivities.length,
        longitude:
          locatedActivities.reduce(
            (sum, activity) => sum + activity.geo_coordinates.longitude,
            0,
          ) / locatedActivities.length,
      }
    : undefined;
  const hotels = rankHotels(trip.hotels, nightlyBudget, center, {
    clusterLabel: "your planned activities",
    amenities: /family|group/i.test(trip.group_size)
      ? ["family", "breakfast", "wifi"]
      : [],
  });
  const restaurantRanks = rankRestaurants(
    (trip.restaurants ?? []).map((restaurant) => ({
      name: restaurant.restaurant_name,
      cuisine: restaurant.cuisine,
      dietary: restaurant.dietary_tags,
      price: restaurant.estimated_cost ?? parseMoney(restaurant.price),
      rating: restaurant.rating,
      distanceKm:
        center && restaurant.geo_coordinates
          ? haversineDistanceKm(center, restaurant.geo_coordinates)
          : undefined,
      mealTypes: restaurant.meal_types,
      opening_time: restaurant.opening_time,
      closing_time: restaurant.closing_time,
      source_metadata: restaurant.source_metadata,
    })),
    {
      cuisine: trip.cuisine_preferences,
      dietary: trip.dietary_preferences,
      mealType: trip.preferred_meal_type,
      budget: allocation.food / (days * partySize(trip.group_size)),
      maxDistanceKm:
        trip.walking_tolerance === "low"
          ? 2
          : trip.walking_tolerance === "high"
            ? 10
            : 5,
    },
  );
  const restaurantByName = new Map(
    restaurantRanks.map((restaurant) => [restaurant.name, restaurant]),
  );
  const restaurants = trip.restaurants
    ?.map((restaurant) => {
      const ranked = restaurantByName.get(restaurant.restaurant_name);
      return ranked
        ? {
            ...restaurant,
            recommendation_score: ranked.recommendation_score,
            recommendation_reasons: ranked.recommendation_reasons,
          }
        : restaurant;
    })
    .sort(
      (a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0),
    );
  const hotelStart = hotels[0]?.geo_coordinates;
  let routeDistance = 0;
  let savedDistance = 0;
  let allProviderRoutesAvailable = Boolean(routing) && allActivities.length > 0;
  let routeDataUnavailable =
    allActivities.length === 0 ||
    allActivities.every(
      (activity) => !isValidCoordinates(activity.geo_coordinates),
    );
  let hasProviderRoute = false;
  let hasEstimatedRoute = !routing;
  let feasibleCount = 0;
  const decisionReasons: string[] = [];

  const proposedCount = trip.itinerary.reduce(
    (sum, day) => sum + day.activities.length,
    0,
  );
  if (trip.itinerary.length > days) {
    for (const day of trip.itinerary.slice(days))
      decisionReasons.push(
        `Day ${day.day}: removed because it falls outside the trip dates.`,
      );
  }
  const intensityFactor =
    trip.activity_intensity === "relaxed"
      ? 1.3
      : trip.activity_intensity === "packed"
        ? 0.8
        : 1;
  const preferredTime =
    trip.preferred_time_of_day === "flexible"
      ? undefined
      : trip.preferred_time_of_day;
  const itinerary = trip.itinerary.slice(0, days).map((day) => {
    const route = optimizeRoute(
      day.activities,
      hotelStart,
      routing
        ? {
            distanceBetween: (from, to) => {
              const a = "geo_coordinates" in from ? from.geo_coordinates : from;
              const b = "geo_coordinates" in to ? to.geo_coordinates : to;
              return routing.distanceBetweenKm(a, b);
            },
            source: routing.source ?? "PROVIDER_ROUTE",
          }
        : undefined,
    );
    routeDistance += route.totalDistanceKm;
    savedDistance += route.savedDistanceKm;
    if (route.distanceSource === "UNAVAILABLE") {
      allProviderRoutesAvailable = false;
      hasEstimatedRoute = true;
    }
    if (route.distanceSource === "PROVIDER_ROUTE") hasProviderRoute = true;
    if (
      route.distanceSource === "STRAIGHT_LINE_ESTIMATE" ||
      route.distanceSource === "MIXED_ESTIMATE"
    )
      hasEstimatedRoute = true;
    if (route.distanceSource === "MIXED_ESTIMATE") {
      hasProviderRoute = true;
      hasEstimatedRoute = true;
    }
    if (route.distanceSource !== "PROVIDER_ROUTE")
      allProviderRoutesAvailable = false;
    let previous = hotelStart;
    const withDistances = route.items.map((activity) => {
      const valid = isValidCoordinates(activity.geo_coordinates);
      const providerDistanceRaw =
        previous && valid && isValidCoordinates(previous)
          ? routing?.distanceBetweenKm(previous, activity.geo_coordinates)
          : undefined;
      const providerDistance =
        providerDistanceRaw !== undefined &&
        Number.isFinite(providerDistanceRaw) &&
        providerDistanceRaw >= 0
          ? providerDistanceRaw
          : undefined;
      const distance =
        previous && valid && isValidCoordinates(previous)
          ? (providerDistance ??
            haversineDistanceKm(previous, activity.geo_coordinates))
          : undefined;
      const providerTravelRaw =
        previous && valid && isValidCoordinates(previous)
          ? routing?.travelTimeBetweenMinutes?.(
              previous,
              activity.geo_coordinates,
            )
          : undefined;
      const providerTravel =
        providerTravelRaw !== undefined &&
        Number.isInteger(providerTravelRaw) &&
        providerTravelRaw >= 0 &&
        providerTravelRaw <= 720
          ? providerTravelRaw
          : undefined;
      previous = valid ? activity.geo_coordinates : previous;
      const estimatedTravel =
        distance === undefined ? undefined : Math.ceil((distance / 20) * 60);
      return {
        ...activity,
        visit_duration_minutes: activity.visit_duration_minutes
          ? Math.min(
              720,
              Math.round(activity.visit_duration_minutes * intensityFactor),
            )
          : trip.activity_intensity === "relaxed"
            ? 120
            : trip.activity_intensity === "packed"
              ? 60
              : 90,
        ...(preferredTime && !activity.best_time_to_visit
          ? { best_time_to_visit: preferredTime }
          : {}),
        ...(providerTravel !== undefined
          ? {
              travel_time_minutes: providerTravel,
              time_travel_each_location: `${providerTravel} minutes`,
            }
          : estimatedTravel !== undefined
            ? { estimated_travel_time_minutes: estimatedTravel }
            : {}),
        travel_estimate_source:
          providerTravel !== undefined
            ? ("VERIFIED" as const)
            : distance !== undefined
              ? ("ESTIMATED" as const)
              : ("UNAVAILABLE" as const),
        ...(distance !== undefined
          ? {
              distance_from_previous_km: Math.round(distance * 10) / 10,
            }
          : {}),
      };
    });
    const schedule = scheduleFeasibleActivities(
      withDistances,
      trip.walking_tolerance === "low" ? 30 : 20,
    );
    feasibleCount += schedule.scheduled.length;
    for (const removed of schedule.removed)
      decisionReasons.push(
        `Day ${day.day}: ${removed.activity.place_name} — ${removed.reason}`,
      );
    return { ...day, activities: schedule.scheduled };
  });

  const budgetItems = itinerary.flatMap((day) =>
    day.activities.flatMap((activity) => {
      const cost =
        activity.estimated_cost ?? parseMoney(activity.ticket_pricing);
      const hasKnownCost =
        activity.estimated_cost !== undefined ||
        /\bfree\b|no cost|included/i.test(activity.ticket_pricing);
      if (!hasKnownCost) return [];
      const text =
        `${activity.place_name} ${activity.place_details}`.toLowerCase();
      const preferenceValue = (trip.interests ?? []).filter((interest) =>
        text.includes(interest.toLowerCase()),
      ).length;
      const reliabilityValue =
        activity.source_metadata?.source === "VERIFIED"
          ? 0.5
          : activity.source_metadata?.source === "USER_PROVIDED"
            ? 0.3
            : 0;
      const distanceValue =
        activity.distance_from_previous_km === undefined
          ? 0
          : 1 / (1 + activity.distance_from_previous_km / 5);
      return [
        {
          cost,
          value: 1 + preferenceValue * 1.5 + reliabilityValue + distanceValue,
          item: activity.place_name,
        },
      ];
    }),
  );
  const budgetSelection = selectWithinBudget(
    budgetItems.slice(0, 300),
    allocation.activities,
    Math.max(1, allocation.activities / 10_000),
  );
  if (hotels[0]?.recommendation_reasons.length)
    decisionReasons.push(
      `Selected ${hotels[0].hotel_name} because it ${hotels[0].recommendation_reasons.join(" and ")}.`,
    );
  const topRestaurant = restaurants
    ?.slice()
    .sort(
      (a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0),
    )[0];
  if (topRestaurant?.recommendation_reasons?.length)
    decisionReasons.push(
      `Recommended ${topRestaurant.restaurant_name} because it ${topRestaurant.recommendation_reasons.join(" and ")}.`,
    );
  if (savedDistance > 0)
    decisionReasons.push(
      `Reordered activities to reduce ${allProviderRoutesAvailable ? "provider route distance" : "estimated straight-line distance"} by ${savedDistance.toFixed(1)} km.`,
    );
  if (budgetSelection.selected.length)
    decisionReasons.push(
      `Prioritized ${budgetSelection.selected.length} activity candidates within the estimated activity budget.`,
    );
  const nightlyHotelEstimate = hotels[0]
    ? parseMoney(hotels[0].price_per_night) * days
    : 0;
  const modeledSpend = nightlyHotelEstimate + budgetSelection.cost;
  const measured = quality(
    trip,
    feasibleCount,
    proposedCount,
    routeDistance,
    totalBudget,
    modeledSpend,
    days,
    itinerary,
  );

  return {
    ...trip,
    hotels,
    ...(restaurants ? { restaurants } : {}),
    itinerary,
    optimization: {
      route_distance_km: Math.round(routeDistance * 10) / 10,
      distance_saved_km: Math.round(savedDistance * 10) / 10,
      budget_activity_cost: Math.round(budgetSelection.cost * 100) / 100,
      budget_activity_names: budgetSelection.selected,
      budget_allocation: allocation,
      quality_score: measured.score,
      quality_dimensions: measured.dimensions,
      decision_reasons: decisionReasons.slice(0, 100),
      distance_source: routeDataUnavailable
        ? "UNAVAILABLE"
        : allProviderRoutesAvailable
          ? "PROVIDER_ROUTE"
          : hasProviderRoute && hasEstimatedRoute
            ? "MIXED_ESTIMATE"
            : "STRAIGHT_LINE_ESTIMATE",
    },
  };
}
