import type {
  AiFeatureRequest as ValidatedAiFeatureRequest,
  TripPreference as ValidatedTripPreference,
  ValidTripInfo,
} from "./schemas";
import type { chatHistorySchema } from "./schemas";

export type User = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
  subscription: string;
};

export type TripPreference = ValidatedTripPreference;

export type TripInfo = ValidTripInfo;
export type Trip = TripInfo;
export type TripDay = TripInfo["itinerary"][number];
export type TripActivity = TripDay["activities"][number];
export type Hotel = TripInfo["hotels"][number];
export type Restaurant = {
  name: string;
  type: string;
  price: string;
  note: string;
};
export type Expense = { label: string; amount: number; currency: string };
export type Reminder = {
  id: string;
  type: "trip" | "packing" | "booking";
  message: string;
  remindAt: Date | string;
  status: "scheduled" | "cancelled" | "completed";
  tripId: string | null;
};
export type AiChatMessage = ReturnType<typeof chatHistorySchema.parse>[number];
export type AiFeatureRequest = ValidatedAiFeatureRequest;
export type AiResponse =
  | {
      resp: string;
      ui: "default" | "budget" | "groupSize" | "tripDuration" | "final";
    }
  | { trip_plan: TripInfo };

export type TravelProviderResponse<T> = {
  data: T;
  provider: string;
  retrievedAt: string;
  verified: boolean;
};

export type UserDetailContextValue = {
  userDetail: User | null;
  setUserDetail: (user: User | null) => void;
};
