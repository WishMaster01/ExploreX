import { bench, describe } from "vitest";
import { tripInfoSchema } from "./ai-schemas";
import { optimizeTripPlan } from "./trip-optimizer";

function representativePlan(days: number, stopsPerDay: number, budget: number) {
  return tripInfoSchema.parse({
    destination: "Jaipur",
    origin: "Delhi",
    duration: `${days} days`,
    budget: `INR ${budget}`,
    currency_code: "INR",
    group_size: "2 people",
    interests: ["history", "culture", "food"],
    hotels: [],
    itinerary: Array.from({ length: days }, (_, dayIndex) => ({
      day: dayIndex + 1,
      day_plan: `Representative Jaipur day ${dayIndex + 1}`,
      best_time_to_visit_day: "flexible",
      activities: Array.from({ length: stopsPerDay }, (_, stopIndex) => ({
        place_name: `Experience ${dayIndex}-${stopIndex}`,
        place_details:
          stopIndex % 2 ? "heritage culture museum" : "garden nature walk",
        place_image_url: "",
        geo_coordinates: {
          latitude: 26.9 + dayIndex * 0.01 + stopIndex * 0.001,
          longitude: 75.8 + (stopIndex % 5) * 0.006,
        },
        place_address: "Jaipur",
        ticket_pricing: "INR 250",
        time_travel_each_location: "unknown",
        best_time_to_visit: "flexible",
        estimated_cost: 250,
        visit_duration_minutes: 75,
        source_metadata: {
          source: "PROVIDER_SOURCED",
          provider: "fixture",
          retrievedAt: "2026-11-10T00:00:00.000Z",
        },
      })),
    })),
  });
}

describe("trip optimizer representative workloads", () => {
  const compactLowBudget = representativePlan(1, 5, 5_000);
  const weekMediumDensity = representativePlan(7, 8, 50_000);
  const monthHighDensity = representativePlan(30, 10, 250_000);

  bench("1 day, 5 nearby candidates, low budget", () => {
    optimizeTripPlan(compactLowBudget);
  });
  bench("7 days, 8 stops per day, medium budget", () => {
    optimizeTripPlan(weekMediumDensity);
  });
  bench("30 days, 10 stops per day, dense city, higher budget", () => {
    optimizeTripPlan(monthHighDensity);
  });
});
