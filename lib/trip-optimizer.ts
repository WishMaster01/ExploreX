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
  parseMoneyForCurrency,
  rankHotels,
  rankRestaurants,
} from "./algorithms/recommendation/weighted-scoring";
import { scheduleFeasibleActivities } from "./algorithms/scheduling/itinerary-scheduler";
import { groupNearbyPlaces } from "./algorithms/geography/group-nearby";
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

function experienceCategory(text: string): string | undefined {
  const categories: Array<[string, RegExp]> = [
    ["culture", /museum|art|gallery|craft|music|dance/],
    ["history", /fort|palace|heritage|historic|monument|temple/],
    ["nature", /garden|park|lake|forest|wildlife|mountain|beach/],
    ["food", /food|restaurant|market|cuisine|cooking/],
    ["adventure", /hike|trek|climb|rafting|adventure|cycle/],
  ];
  return categories.find(([, pattern]) => pattern.test(text))?.[0];
}

function withoutCandidateRouteMetrics(
  activity: ValidTripInfo["itinerary"][number]["activities"][number],
) {
  const safe = { ...activity };
  delete safe.travel_time_minutes;
  delete safe.estimated_travel_time_minutes;
  delete safe.distance_from_previous_km;
  return safe;
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
  constraints: {
    requiredActivityNames?: string[];
    budgetCeiling?: number;
    accessibilityNeeds?: string[];
  } = {},
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
  const budgetAmount = parseMoneyForCurrency(trip.budget, trip.currency_code);
  const currencyCode =
    trip.currency_code ?? budgetAmount.currencyCode ?? undefined;
  const totalBudget =
    budgetAmount.mismatch || !currencyCode ? 0 : budgetAmount.amount;
  const warnings: string[] = [];
  const allocation = allocateTripBudget(
    totalBudget,
    days,
    partySize(trip.group_size),
    trip.travel_style ?? "standard",
  );
  const nightlyBudget = allocation.accommodation / days;
  let duplicateActivityCount = 0;
  const itineraryInput = trip.itinerary.slice(0, days).map((day) => {
    const seen = new Set<string>();
    const activities = day.activities.filter((activity) => {
      const name = activity.place_name.trim().toLocaleLowerCase("en");
      const point = activity.geo_coordinates;
      const key = `${name}|${isValidCoordinates(point) ? `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}` : "unlocated"}`;
      if (seen.has(key)) {
        duplicateActivityCount += 1;
        return false;
      }
      seen.add(key);
      return true;
    });
    return { ...day, activities };
  });
  const allActivities = itineraryInput.flatMap((day) => day.activities);
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
    currencyCode,
    amenities: /family|group/i.test(trip.group_size)
      ? ["family", "breakfast", "wifi"]
      : [],
  });
  const restaurantRanks = rankRestaurants(
    (trip.restaurants ?? []).map((restaurant) => {
      const parsedPrice = parseMoneyForCurrency(restaurant.price, currencyCode);
      if (parsedPrice.mismatch)
        warnings.push(
          `${restaurant.restaurant_name} uses a different currency and was excluded from budget ranking.`,
        );
      return {
        name: restaurant.restaurant_name,
        cuisine: restaurant.cuisine,
        dietary: restaurant.dietary_tags,
        price:
          restaurant.estimated_cost ??
          (parsedPrice.known && !parsedPrice.mismatch
            ? parsedPrice.amount
            : undefined),
        rating: restaurant.rating,
        distanceKm:
          center && restaurant.geo_coordinates
            ? haversineDistanceKm(center, restaurant.geo_coordinates)
            : undefined,
        mealTypes: restaurant.meal_types,
        opening_time: restaurant.opening_time,
        closing_time: restaurant.closing_time,
        source_metadata: restaurant.source_metadata,
      };
    }),
    {
      currencyCode,
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
  let hasUnavailableRoute = false;
  let feasibleCount = 0;
  const decisionReasons: string[] = [];
  const constraintViolations: string[] = [];
  if (!currencyCode)
    warnings.push(
      "Budget calculations are unavailable because the plan currency is unknown.",
    );
  if (budgetAmount.mismatch)
    warnings.push(
      "The stated trip budget currency does not match the plan currency; no budget allocation was calculated.",
    );
  const geographicGroups = groupNearbyPlaces(allActivities, 3);
  if (geographicGroups.duplicateCount)
    warnings.push(
      `Removed ${geographicGroups.duplicateCount} duplicate place candidate${geographicGroups.duplicateCount === 1 ? "" : "s"} from geographic grouping.`,
    );
  if (duplicateActivityCount)
    warnings.push(
      `Removed ${duplicateActivityCount} duplicate itinerary stop${duplicateActivityCount === 1 ? "" : "s"}.`,
    );
  if (geographicGroups.unlocated.length)
    warnings.push(
      `${geographicGroups.unlocated.length} stop${geographicGroups.unlocated.length === 1 ? " has" : "s have"} no usable coordinates; its route distance cannot be measured.`,
    );
  if (geographicGroups.groups.length > 1)
    decisionReasons.push(
      `Grouped ${allActivities.length - geographicGroups.unlocated.length} located stops into ${geographicGroups.groups.length} geographic areas within a 3 km radius.`,
    );
  if (
    allActivities.some((activity) => activity.travel_time_minutes === undefined)
  )
    warnings.push(
      "Some route legs lack provider-calculated duration; distance estimates are not confirmed transport times.",
    );
  for (const activity of allActivities) {
    const verifiedAt = activity.source_metadata?.retrievedAt
      ? Date.parse(activity.source_metadata.retrievedAt)
      : Number.NaN;
    if (
      activity.source_metadata?.source === "STALE" ||
      (Number.isFinite(verifiedAt) &&
        Date.now() - verifiedAt > 180 * 86_400_000)
    )
      warnings.push(
        `${activity.place_name} information is stale and should be rechecked.`,
      );
    if (!activity.opening_time && !activity.closing_time)
      warnings.push(
        `${activity.place_name} has no reliable opening hours; a general daytime schedule is used.`,
      );
  }

  const proposedCount = trip.itinerary.reduce(
    (sum, day) => sum + day.activities.length,
    0,
  );
  if (trip.itinerary.length > days) {
    constraintViolations.push(
      "The proposed itinerary exceeds the trip duration or date range.",
    );
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
  const itinerary = itineraryInput.map((day) => {
    const accessibleActivities = day.activities.filter((activity) => {
      if (!constraints.accessibilityNeeds?.length) return true;
      const source = activity.source_metadata?.source;
      const trusted = source === "VERIFIED" || source === "PROVIDER_SOURCED";
      const tags = activity.accessibility_tags ?? [];
      const supported =
        trusted &&
        constraints.accessibilityNeeds.every((need) =>
          tags.some(
            (tag) =>
              tag.toLocaleLowerCase("en") === need.toLocaleLowerCase("en"),
          ),
        );
      if (!supported) {
        constraintViolations.push(
          `Accessibility need could not be confirmed for ${activity.place_name}: ${constraints.accessibilityNeeds.join(", ")}.`,
        );
        return false;
      }
      return true;
    });
    const safeActivities = accessibleActivities.map((activity) => {
      const source = activity.source_metadata?.source;
      const trusted = source === "VERIFIED" || source === "PROVIDER_SOURCED";
      if (activity.unavailable_periods?.length && !trusted) {
        warnings.push(
          `${activity.place_name} has unverified closure periods; they were ignored.`,
        );
        return { ...activity, unavailable_periods: undefined };
      }
      return activity;
    });
    const route = optimizeRoute(
      safeActivities,
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
      hasUnavailableRoute = true;
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
      const hoursTrusted = ["VERIFIED", "PROVIDER_SOURCED"].includes(
        activity.source_metadata?.source ?? "",
      );
      if ((activity.opening_time || activity.closing_time) && !hoursTrusted)
        warnings.push(
          `${activity.place_name} has unverified opening hours; schedule uses a general daytime window.`,
        );
      return {
        ...withoutCandidateRouteMetrics(activity),
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
              time_travel_each_location: `${providerTravel} minutes (provider route)`,
            }
          : estimatedTravel !== undefined
            ? {
                estimated_travel_time_minutes: estimatedTravel,
                time_travel_each_location: `${estimatedTravel} minutes (estimated)`,
              }
            : { time_travel_each_location: "Unavailable" }),
        ...(!hoursTrusted
          ? { opening_time: undefined, closing_time: undefined }
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
    for (const removed of schedule.removed)
      if (
        removed.activity.max_travel_time_minutes !== undefined ||
        /opening hours|remaining day schedule/i.test(removed.reason)
      )
        constraintViolations.push(
          `Day ${day.day}: ${removed.activity.place_name} could not satisfy a travel-time or schedule constraint.`,
        );
    return { ...day, activities: schedule.scheduled };
  });

  const pricedActivities = itinerary.flatMap((day) =>
    day.activities.map((activity) => {
      const parsed = parseMoneyForCurrency(
        activity.ticket_pricing,
        currencyCode,
      );
      const explicitFree = /\bfree\b|no cost|included/i.test(
        activity.ticket_pricing,
      );
      const amount =
        activity.estimated_cost ??
        (parsed.mismatch || !parsed.known ? undefined : parsed.amount);
      const known =
        explicitFree ||
        (amount !== undefined &&
          currencyCode !== undefined &&
          !parsed.mismatch);
      if (!known)
        warnings.push(
          `${activity.place_name} has an unknown or incompatible price; budget totals are incomplete.`,
        );
      return {
        activity,
        amount: explicitFree ? 0 : known ? amount : undefined,
        known,
      };
    }),
  );
  const budgetItems = pricedActivities.flatMap(
    ({ activity, amount, known }) => {
      if (!known || amount === undefined) return [];
      const text =
        `${activity.place_name} ${activity.place_details}`.toLowerCase();
      const preferenceValue = (trip.interests ?? []).filter((interest) =>
        text.includes(interest.toLowerCase()),
      ).length;
      const source = activity.source_metadata?.source;
      const reliabilityValue =
        source === "VERIFIED" || source === "PROVIDER_SOURCED"
          ? 0.8
          : source === "USER_PROVIDED"
            ? 0.25
            : 0;
      const verifiedAt = activity.source_metadata?.retrievedAt
        ? Date.parse(activity.source_metadata.retrievedAt)
        : Number.NaN;
      const isFresh =
        Number.isFinite(verifiedAt) &&
        Date.now() - verifiedAt < 180 * 86_400_000;
      const freshnessValue = isFresh ? 0.3 : 0;
      if (source === "STALE" || (Number.isFinite(verifiedAt) && !isFresh))
        warnings.push(
          `${activity.place_name} information is stale and should be rechecked.`,
        );
      const category = experienceCategory(text);
      const categoryCount = category
        ? pricedActivities.filter(
            (row) =>
              experienceCategory(
                `${row.activity.place_name} ${row.activity.place_details}`.toLowerCase(),
              ) === category,
          ).length
        : 0;
      const diversityValue =
        category &&
        categoryCount <= 2 &&
        (source === "VERIFIED" || source === "PROVIDER_SOURCED")
          ? 0.45
          : 0;
      const distanceValue =
        activity.distance_from_previous_km === undefined
          ? 0
          : 1 / (1 + activity.distance_from_previous_km / 5);
      return [
        {
          cost: Math.round(amount * 100) / 100,
          value:
            1 +
            preferenceValue * 1.5 +
            reliabilityValue +
            freshnessValue +
            distanceValue +
            diversityValue,
          item: activity.place_name,
        },
      ];
    },
  );
  const budgetSelection = selectWithinBudget(
    budgetItems.slice(0, 300),
    allocation.activities,
    Math.max(0.01, allocation.activities / 10_000),
  );
  const knownActivitySpend = pricedActivities.reduce(
    (sum, row) => sum + (row.known ? (row.amount ?? 0) : 0),
    0,
  );
  const hotelPrice = hotels[0]
    ? parseMoneyForCurrency(hotels[0].price_per_night, currencyCode)
    : undefined;
  const knownHotelSpend =
    hotelPrice?.known && !hotelPrice.mismatch && currencyCode
      ? hotelPrice.amount * days
      : 0;
  if (
    hotels.length &&
    (!hotelPrice?.known || hotelPrice.mismatch || !currencyCode)
  )
    warnings.push(
      "Accommodation price is unknown or uses a different currency; it is excluded from totals.",
    );
  const estimatedKnownSpend = knownActivitySpend + knownHotelSpend;
  const budgetCeiling = constraints.budgetCeiling ?? totalBudget;
  if (currencyCode && estimatedKnownSpend > budgetCeiling + 0.005)
    constraintViolations.push(
      `Known itinerary costs (${estimatedKnownSpend.toFixed(2)} ${currencyCode}) exceed the budget ceiling (${budgetCeiling.toFixed(2)} ${currencyCode}).`,
    );
  if (currencyCode && knownActivitySpend > allocation.activities + 0.005)
    constraintViolations.push(
      `Known activity costs (${knownActivitySpend.toFixed(2)} ${currencyCode}) exceed the activity allocation (${allocation.activities.toFixed(2)} ${currencyCode}).`,
    );
  for (const required of constraints.requiredActivityNames ?? [])
    if (
      !itinerary.some((day) =>
        day.activities.some(
          (activity) =>
            activity.place_name.toLocaleLowerCase("en") ===
            required.toLocaleLowerCase("en"),
        ),
      )
    )
      constraintViolations.push(
        `Required activity was not scheduled: ${required}.`,
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
  for (const selectedName of budgetSelection.selected.slice(0, 30)) {
    const row = pricedActivities.find(
      (item) => item.activity.place_name === selectedName,
    );
    if (row)
      decisionReasons.push(
        `Selected ${selectedName} at an estimated ${Number(row.amount ?? 0).toFixed(2)} ${currencyCode ?? "unknown currency"}; its scheduled visit takes ${row.activity.visit_duration_minutes ?? 90} minutes and its preceding leg is ${row.activity.travel_time_minutes !== undefined ? `${row.activity.travel_time_minutes} min provider-calculated` : row.activity.estimated_travel_time_minutes !== undefined ? `${row.activity.estimated_travel_time_minutes} min estimated` : "unknown"}.`,
      );
  }
  const modeledSpend = estimatedKnownSpend;
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
      known_activity_cost: Math.round(knownActivitySpend * 100) / 100,
      known_total_cost: Math.round(estimatedKnownSpend * 100) / 100,
      ...(currencyCode ? { budget_currency_code: currencyCode } : {}),
      constraint_violations: [...new Set(constraintViolations)].slice(0, 50),
      warnings: [...new Set(warnings)].slice(0, 50),
      budget_allocation: allocation,
      quality_score: measured.score,
      quality_dimensions: measured.dimensions,
      decision_reasons: decisionReasons.slice(0, 100),
      distance_source: routeDataUnavailable
        ? "UNAVAILABLE"
        : hasUnavailableRoute
          ? "UNAVAILABLE"
          : allProviderRoutesAvailable
            ? "PROVIDER_ROUTE"
            : hasProviderRoute && hasEstimatedRoute
              ? "MIXED_ESTIMATE"
              : "STRAIGHT_LINE_ESTIMATE",
    },
  };
}
