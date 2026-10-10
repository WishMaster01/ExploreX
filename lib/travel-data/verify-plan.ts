import type { ValidTripInfo } from "@/lib/domain/schemas";
import { APP_CONFIG } from "@/lib/config";
import { AsyncRequestQueue } from "@/lib/async-request-queue";
import { getTravelDataProvider } from "./provider";
import {
  markCandidateSources,
  safelySearchPlaces,
  verifiedPlaceMatch,
  verifiedPlaceMetadata,
} from "./plan-source";
import type { TravelDataProvider } from "./types";

const providerQueue = new AsyncRequestQueue(
  APP_CONFIG.queue.travelDataConcurrency,
  APP_CONFIG.queue.travelDataMaxPending,
);

export async function attachTravelSources(
  plan: ValidTripInfo,
  provider: TravelDataProvider = getTravelDataProvider(),
): Promise<{
  plan: ValidTripInfo;
  provider: string;
  verifiedCount: number;
}> {
  let verifiedCount = 0;
  const marked = markCandidateSources(plan);
  const hotels = marked.hotels;
  const itinerary = marked.itinerary;

  if (provider.name === "unavailable") {
    return {
      plan: { ...plan, hotels, itinerary },
      provider: provider.name,
      verifiedCount,
    };
  }

  const hotelChecks = hotels
    .slice(0, APP_CONFIG.travelData.maxVerifiedHotels)
    .map(async (hotel, index) => {
      const result = await safelySearchPlaces(provider.name, () =>
        providerQueue.run(() =>
          provider.searchHotels(`${hotel.hotel_name}, ${plan.destination}`),
        ),
      );
      const match = verifiedPlaceMatch(hotel.hotel_name, result);
      if (!match) return;
      verifiedCount += 1;
      hotels[index] = {
        ...hotel,
        source_metadata: verifiedPlaceMetadata(
          match,
          result.source.retrievedAt,
        ),
      };
    });
  const activityRefs = itinerary
    .flatMap((day, dayIndex) =>
      day.activities.map((activity, activityIndex) => ({
        activity,
        dayIndex,
        activityIndex,
      })),
    )
    .slice(0, APP_CONFIG.travelData.maxVerifiedActivities);
  const activityChecks = activityRefs.map(
    async ({ activity, dayIndex, activityIndex }) => {
      const result = await safelySearchPlaces(provider.name, () =>
        providerQueue.run(() =>
          provider.searchPlaces(`${activity.place_name}, ${plan.destination}`),
        ),
      );
      const match = verifiedPlaceMatch(activity.place_name, result);
      if (!match) return;
      verifiedCount += 1;
      itinerary[dayIndex].activities[activityIndex] = {
        ...activity,
        source_metadata: verifiedPlaceMetadata(
          match,
          result.source.retrievedAt,
        ),
      };
    },
  );
  await Promise.all([...hotelChecks, ...activityChecks]);
  return {
    plan: { ...plan, hotels, itinerary },
    provider: provider.name,
    verifiedCount,
  };
}
