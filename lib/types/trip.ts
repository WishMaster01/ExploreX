import type {
  TripActivity,
  TripDay,
  TripInfo,
  Hotel,
} from "@/lib/domain/types";
import type { Restaurant } from "@/lib/domain/types";
import type { TravelSourceMetadata } from "@/lib/travel-data/types";

export type { TripActivity, TripDay, TripInfo };
export type TripHotel = Hotel;

export type TimelineSegment = {
  period: string;
  title: string;
  image: string;
  detail: string;
  cost: string;
  duration: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  distanceKm?: number;
  sourceMetadata?: TravelSourceMetadata;
};

export type DisplayDay = {
  day: number;
  title: string;
  best: string;
  route: string;
  segments: TimelineSegment[];
};

export type DisplayHotel = {
  name: string;
  address: string;
  price: string;
  image: string;
  rating: number;
  description: string;
  recommendationScore?: number;
  sourceMetadata?: TravelSourceMetadata;
  amenities: string[];
  recommendationReasons: string[];
};

export type DisplayRestaurant = Restaurant & {
  name: string;
  type: string;
  price: string;
  note: string;
};

export type MapMarker = {
  label: string;
  type: "hotel" | "activity" | "food";
  coordinates: { latitude: number; longitude: number };
  day?: number;
};

export type BudgetTier = {
  label: string;
  value: string;
  detail: string;
  recommended?: boolean;
};

export type DisplayTrip = {
  destination: string;
  origin: string;
  duration: string;
  budget: string;
  group_size: string;
  heroImage: string;
  totalActivities: number;
  hotels: DisplayHotel[];
  restaurants: DisplayRestaurant[];
  days: DisplayDay[];
  mapMarkers: MapMarker[];
  budgetBreakdown: { label: string; percent: number; amount: string }[];
  budgetTiers: BudgetTier[];
  topAttractions: string[];
  insights: { label: string; value: string }[];
  packingItems: string[];
  travelDocuments: { item: string; tip: string }[];
  localEssentials: { label: string; value: string }[];
  transportation: { mode: string; value: string; note: string }[];
  bookingChecklist: { item: string; booked: boolean }[];
  tripComparison: BudgetTier[];
  mapTip: string;
  transitMinutes: string;
  walkDistance: string;
  routeDistance: string;
  distanceSaved: string;
  budgetActivityNames: string[];
  budgetActivityCost: number;
  qualityScore?: number;
  decisionReasons: string[];
  distanceSource?:
    | "STRAIGHT_LINE_ESTIMATE"
    | "PROVIDER_ROUTE"
    | "MIXED_ESTIMATE"
    | "UNAVAILABLE";
};
