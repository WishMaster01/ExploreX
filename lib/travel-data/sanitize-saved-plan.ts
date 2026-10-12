import type { ValidTripInfo } from "@/lib/domain/schemas";
import { sourceMetadata } from "./types";

export function sanitizeSavedPlanSources(plan: ValidTripInfo): ValidTripInfo {
  return {
    ...plan,
    budget_source_metadata: sourceMetadata(
      "AI_GENERATED",
      "user_saved",
      "Saved-plan budget data is user-submitted and not verified.",
    ),
    hotels: plan.hotels.map((hotel) => ({
      ...hotel,
      source_metadata: sourceMetadata(
        "AI_GENERATED",
        "user_saved",
        "Saved-plan listing details are user-submitted and not re-verified.",
      ),
    })),
    ...(plan.restaurants
      ? {
          restaurants: plan.restaurants.map((restaurant) => ({
            ...restaurant,
            source_metadata: sourceMetadata(
              "AI_GENERATED",
              "user_saved",
              "Saved restaurant candidate details are user-submitted and not re-verified.",
            ),
          })),
        }
      : {}),
    itinerary: plan.itinerary.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        source_metadata: sourceMetadata(
          "AI_GENERATED",
          "user_saved",
          "Saved-plan listing details are user-submitted and not re-verified.",
        ),
        travel_estimate_source: "ESTIMATED" as const,
      })),
    })),
    ...(plan.optimization
      ? {
          optimization: {
            ...plan.optimization,
            distance_source: "STRAIGHT_LINE_ESTIMATE",
            source_metadata: sourceMetadata(
              "ESTIMATED",
              "user_saved",
              "Saved-plan route estimates are not live routing.",
            ),
          },
        }
      : {}),
  };
}
