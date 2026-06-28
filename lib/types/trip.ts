export type TripActivity = {
  place_name: string;
  place_details: string;
  place_image_url: string;
  geo_coordinates: {
    latitude: number;
    longitude: number;
  };
  place_address: string;
  ticket_pricing: string;
  time_travel_each_location: string;
  best_time_to_visit: string;
  estimated_cost?: number;
  opening_time?: string;
  closing_time?: string;
  visit_duration_minutes?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  distance_from_previous_km?: number;
};

export type TripHotel = {
  hotel_name: string;
  hotel_address: string;
  price_per_night: string;
  hotel_image_url: string;
  geo_coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  description: string;
  recommendation_score?: number;
};

export type TripDay = {
  day: number;
  day_plan: string;
  best_time_to_visit_day: string;
  activities: TripActivity[];
};

export type TripInfo = {
  budget: string;
  destination: string;
  duration: string;
  group_size: string;
  origin: string;
  hotels: TripHotel[];
  itinerary: TripDay[];
  optimization?: {
    route_distance_km: number;
    distance_saved_km: number;
    budget_activity_cost: number;
    budget_activity_names: string[];
  };
};

export type TimelineSegment = {
  period: string;
  title: string;
  image: string;
  detail: string;
  cost: string;
  duration: string;
  address: string;
  distanceKm?: number;
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
};

export type DisplayRestaurant = {
  name: string;
  type: string;
  price: string;
  note: string;
};

export type MapMarker = {
  label: string;
  left: string;
  top: string;
  type: "hotel" | "activity" | "food";
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
  budgetBreakdown: { label: string; percent: number }[];
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
};
