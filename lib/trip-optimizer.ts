import { selectWithinBudget } from "./algorithms/budget/knapsack";
import { haversineDistanceKm, isValidCoordinates } from "./algorithms/graph/haversine";
import { optimizeRoute } from "./algorithms/graph/route-optimizer";
import { parseMoney, rankHotels } from "./algorithms/recommendation/weighted-scoring";
import { scheduleActivities } from "./algorithms/scheduling/itinerary-scheduler";
import type { ValidTripInfo } from "./ai-schemas";

function durationDays(value: string): number {
  return Math.max(1, Number(value.match(/\d+/)?.[0] ?? 1));
}

export function optimizeTripPlan(trip: ValidTripInfo): ValidTripInfo {
  const days = durationDays(trip.duration);
  const totalBudget = parseMoney(trip.budget);
  const nightlyBudget = totalBudget > 0 ? (totalBudget * 0.4) / days : 0;
  const allActivities = trip.itinerary.flatMap((day) => day.activities);
  const center = allActivities.find((activity) => isValidCoordinates(activity.geo_coordinates))?.geo_coordinates;
  const hotels = rankHotels(trip.hotels, nightlyBudget, center);
  const hotelStart = hotels[0]?.geo_coordinates;
  let routeDistance = 0;
  let savedDistance = 0;

  const itinerary = trip.itinerary.map((day) => {
    const route = optimizeRoute(day.activities, hotelStart);
    routeDistance += route.totalDistanceKm;
    savedDistance += route.savedDistanceKm;
    let previous = hotelStart;
    const withDistances = route.items.map((activity) => {
      const distance = previous && isValidCoordinates(previous)
        ? haversineDistanceKm(previous, activity.geo_coordinates)
        : 0;
      previous = activity.geo_coordinates;
      return { ...activity, distance_from_previous_km: Math.round(distance * 10) / 10 };
    });
    return {
      ...day,
      activities: scheduleActivities(withDistances),
    };
  });

  const budgetItems = itinerary.flatMap((day) =>
    day.activities.map((activity) => ({
      cost: activity.estimated_cost ?? parseMoney(activity.ticket_pricing),
      value: 1 + Math.min(2, activity.place_details.length / 300),
      item: activity.place_name,
    })),
  );
  const activityBudget = totalBudget > 0 ? totalBudget * 0.25 : 0;
  const budgetSelection = activityBudget > 0
    ? selectWithinBudget(budgetItems, activityBudget, Math.max(1, Math.round(activityBudget / 500)))
    : { selected: budgetItems.map((entry) => entry.item), cost: 0, value: 0 };

  return {
    ...trip,
    hotels,
    itinerary,
    optimization: {
      route_distance_km: Math.round(routeDistance * 10) / 10,
      distance_saved_km: Math.round(savedDistance * 10) / 10,
      budget_activity_cost: Math.round(budgetSelection.cost * 100) / 100,
      budget_activity_names: budgetSelection.selected,
    },
  };
}
