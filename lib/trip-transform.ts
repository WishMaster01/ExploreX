import type {
  DisplayDay,
  DisplayRestaurant,
  DisplayTrip,
  MapMarker,
  TripActivity,
  TripDay,
  TripHotel,
  TripInfo,
} from "./types/trip";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop&q=80";

const PERIODS = ["Morning", "Afternoon", "Evening"];
const IMAGE_POOLS = {
  adventure: [
    "photo-1526772662000-3f88f10405ff",
    "photo-1500534314209-a25ddb2bd429",
    "photo-1464822759023-fed622ff2c3b",
  ],
  beach: [
    "photo-1507525428034-b723cf961d3e",
    "photo-1519046904884-53103b34b206",
    "photo-1510414842594-a61c69b5ae57",
  ],
  city: [
    "photo-1500530855697-b586d89ba3ee",
    "photo-1449824913935-59a10b8d2000",
    "photo-1519501025264-65ba15a82390",
  ],
  culture: [
    "photo-1533929736458-ca588d08c8be",
    "photo-1564507592333-c60657eea523",
    "photo-1496568816309-51d7c20e3b21",
  ],
  food: [
    "photo-1414235077428-338989a2e8c0",
    "photo-1504674900247-0877df9cc836",
    "photo-1498837167922-ddd27525d352",
  ],
  hotel: [
    "photo-1566073771259-6a8506099945",
    "photo-1542314831-068cd1dbfeeb",
    "photo-1551882547-ff40c63fe5fa",
  ],
  mountain: [
    "photo-1464822759023-fed622ff2c3b",
    "photo-1506905925346-21bda4d32df4",
    "photo-1454496522488-7a8e488e8606",
  ],
  nature: [
    "photo-1500534314209-a25ddb2bd429",
    "photo-1441974231531-c6227db76b6e",
    "photo-1501785888041-af3ef285b470",
  ],
  nightlife: [
    "photo-1519501025264-65ba15a82390",
    "photo-1514525253161-7a46d19cd819",
    "photo-1506157786151-b8491531f063",
  ],
  shopping: [
    "photo-1441986300917-64674bd600d8",
    "photo-1519567241046-7f570eee3ce6",
    "photo-1483985988355-763728e1935b",
  ],
} as const;

type ImageKind = keyof typeof IMAGE_POOLS;

function hashText(text: string) {
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function imageKindForText(text: string, fallback: ImageKind): ImageKind {
  const value = text.toLowerCase();

  if (/hotel|resort|stay|suite|villa|inn|lodge/.test(value)) return "hotel";
  if (
    /food|restaurant|cafe|dining|market|bistro|eat|brunch|lunch|dinner|cuisine/.test(
      value,
    )
  )
    return "food";
  if (/beach|coast|island|sea|ocean|snorkel|surf/.test(value)) return "beach";
  if (/mountain|hill|hike|trek|alps|peak|trail/.test(value)) return "mountain";
  if (
    /museum|temple|palace|fort|castle|heritage|gallery|monument|historic|culture/.test(
      value,
    )
  )
    return "culture";
  if (/shop|mall|bazaar|souvenir|market/.test(value)) return "shopping";
  if (/night|bar|club|pub|music|show|theater/.test(value)) return "nightlife";
  if (/park|garden|forest|lake|waterfall|nature|wildlife/.test(value))
    return "nature";
  if (/adventure|zip|rafting|safari|ski|dive/.test(value)) return "adventure";

  return fallback;
}

function generatedImage(
  kind: ImageKind,
  seed: string,
  width = 1200,
  height = 800,
) {
  const pool = IMAGE_POOLS[kind];
  const photoId = pool[hashText(seed) % pool.length];
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&auto=format&fit=crop&q=80`;
}

function validRemoteImage(url?: string) {
  if (!url) return "";

  const value = url.trim();

  if (
    value.length < 10 ||
    value.includes("example.com") ||
    value.includes("placeholder") ||
    value.includes("image_url") ||
    value.includes("unsplash.com/photos/")
  ) {
    return "";
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    if (parsed.hostname === "images.unsplash.com") return value;
    if (
      parsed.hostname === "via.placeholder.com" &&
      /\.(avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname)
    ) {
      return value;
    }
    return "";
  } catch {
    return "";
  }
}

function safeImage(
  url: string | undefined,
  seed: string,
  fallbackKind: ImageKind,
) {
  return (
    validRemoteImage(url) ||
    generatedImage(imageKindForText(seed, fallbackKind), seed)
  );
}

function inferPeriod(timeHint: string, index: number, total: number): string {
  const hint = timeHint?.toLowerCase() ?? "";
  if (
    hint.includes("morning") ||
    hint.includes("sunrise") ||
    hint.includes("early")
  )
    return "Morning";
  if (
    hint.includes("evening") ||
    hint.includes("night") ||
    hint.includes("sunset")
  )
    return "Evening";
  if (hint.includes("afternoon") || hint.includes("lunch")) return "Afternoon";
  if (total <= 3) return PERIODS[index] ?? "Afternoon";
  if (index === 0) return "Morning";
  if (index === total - 1) return "Evening";
  return "Afternoon";
}

function parseBudgetNumber(budget: string): number {
  const match = budget.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 2000;
}

function formatCurrency(amount: number, budget: string, currencyCode?: string) {
  const fallbackCurrency = budget.includes("€")
    ? "EUR"
    : budget.includes("£")
      ? "GBP"
      : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || fallbackCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currencyCode || ""}`.trim();
  }
}

function isFoodRelated(activity: TripActivity) {
  const text = `${activity.place_name} ${activity.place_details}`.toLowerCase();
  return /food|restaurant|cafe|dining|market|bistro|eat|brunch|lunch|dinner|street food|cuisine/.test(
    text,
  );
}

function displayRestaurants(trip: TripInfo): DisplayRestaurant[] {
  return (trip.restaurants ?? []).map((restaurant) => ({
    ...restaurant,
    name: restaurant.restaurant_name,
    type:
      restaurant.cuisine ||
      restaurant.meal_types?.join(", ") ||
      "Restaurant candidate",
    price:
      restaurant.price ||
      (restaurant.estimated_cost !== undefined
        ? `${restaurant.estimated_cost} ${trip.currency_code ?? "currency units"}`
        : "Price unavailable"),
    note:
      [restaurant.note, ...(restaurant.recommendation_reasons ?? [])]
        .filter(Boolean)
        .join(" · ") ||
      "Restaurant candidate; verify current hours, menu, and availability.",
    source_metadata: restaurant.source_metadata,
  }));
}

function buildMapMarkers(trip: TripInfo): MapMarker[] {
  const markers: MapMarker[] = [];
  trip.hotels?.slice(0, 1).forEach((hotel) => {
    const coordinates = hotel.geo_coordinates;
    if (!coordinates) return;
    markers.push({
      label: hotel.hotel_name,
      type: "hotel",
      coordinates,
    });
  });

  const allActivities =
    trip.itinerary?.flatMap((day) =>
      day.activities.map((activity) => ({ activity, day: day.day })),
    ) ?? [];
  allActivities.slice(0, 20).forEach(({ activity, day }) => {
    const coordinates = activity.geo_coordinates;
    if (!coordinates) return;
    markers.push({
      label: activity.place_name,
      type: isFoodRelated(activity) ? "food" : "activity",
      coordinates,
      day,
    });
  });

  trip.restaurants?.slice(0, 10).forEach((restaurant) => {
    if (!restaurant.geo_coordinates) return;
    markers.push({
      label: restaurant.restaurant_name,
      type: "food",
      coordinates: restaurant.geo_coordinates,
    });
  });

  return markers;
}

export function withGeneratedTripImages(trip: TripInfo): TripInfo {
  const destination = trip.destination || "travel destination";
  const hotels: TripHotel[] = (trip.hotels ?? []).map((hotel) => {
    const seed = `${hotel.hotel_name} ${hotel.hotel_address} ${destination}`;

    return {
      ...hotel,
      hotel_image_url: safeImage(hotel.hotel_image_url, seed, "hotel"),
    };
  });

  const itinerary: TripDay[] = (trip.itinerary ?? []).map((day) => ({
    ...day,
    activities: (day.activities ?? []).map((activity) => {
      const seed = `${activity.place_name} ${activity.place_details} ${destination}`;

      return {
        ...activity,
        place_image_url: safeImage(activity.place_image_url, seed, "city"),
      };
    }),
  }));

  return {
    ...trip,
    hotels,
    itinerary,
  };
}

export function transformTripToDisplay(trip: TripInfo): DisplayTrip {
  const tripWithImages = withGeneratedTripImages(trip);
  const allActivities =
    tripWithImages.itinerary?.flatMap((d) => d.activities) ?? [];
  const heroImage =
    validRemoteImage(allActivities[0]?.place_image_url) ||
    validRemoteImage(tripWithImages.hotels?.[0]?.hotel_image_url) ||
    FALLBACK_IMAGE;

  const days: DisplayDay[] = (tripWithImages.itinerary ?? []).map((day) => {
    const activities = day.activities ?? [];
    const segments = activities.map((act, idx) => ({
      period:
        act.scheduled_start && act.scheduled_end
          ? `${act.scheduled_start}–${act.scheduled_end}`
          : inferPeriod(act.best_time_to_visit, idx, activities.length),
      title: act.place_name,
      image: safeImage(
        act.place_image_url,
        `${act.place_name} ${tripWithImages.destination}`,
        "city",
      ),
      detail: act.place_details || "Explore at your own pace.",
      cost: act.ticket_pricing || "Free",
      duration: act.visit_duration_minutes
        ? `${act.visit_duration_minutes} min visit`
        : "Visit duration not specified",
      address: act.place_address || tripWithImages.destination,
      distanceKm: act.distance_from_previous_km,
      coordinates: act.geo_coordinates ?? undefined,
      sourceMetadata: act.source_metadata,
    }));

    return {
      day: day.day,
      title:
        day.day_plan ||
        `Day ${day.day} in ${tripWithImages.destination.split(",")[0]}`,
      best: day.best_time_to_visit_day || "Full day exploration",
      route: `${activities.length} stops - ${activities.some((activity) => activity.distance_from_previous_km !== undefined) ? `${activities.reduce((sum, activity) => sum + (activity.distance_from_previous_km ?? 0), 0).toFixed(1)} km ${tripWithImages.optimization?.distance_source === "PROVIDER_ROUTE" ? "provider route" : tripWithImages.optimization?.distance_source === "MIXED_ESTIMATE" ? "mixed distance estimate" : "straight-line estimate"}` : "distance unavailable"}`,
      segments,
    };
  });

  const budgetNum = parseBudgetNumber(tripWithImages.budget);
  const budgetTiers = [
    {
      label: "Budget",
      value: formatCurrency(
        budgetNum * 0.6,
        tripWithImages.budget,
        tripWithImages.currency_code,
      ),
      detail: "Hostels, public transit, free attractions",
    },
    {
      label: "Standard",
      value:
        tripWithImages.budget ||
        formatCurrency(
          budgetNum,
          tripWithImages.budget,
          tripWithImages.currency_code,
        ),
      detail: "Comfortable stays and curated experiences",
      recommended: true,
    },
    {
      label: "Luxury",
      value: formatCurrency(
        budgetNum * 1.8,
        tripWithImages.budget,
        tripWithImages.currency_code,
      ),
      detail: "Premium hotels, private transfers, fine dining",
    },
  ];

  const destCity = tripWithImages.destination.split(",")[0].trim();

  return {
    destination: tripWithImages.destination,
    origin: tripWithImages.origin,
    duration: tripWithImages.duration,
    budget: tripWithImages.budget,
    group_size: tripWithImages.group_size,
    heroImage,
    totalActivities: allActivities.length,
    hotels: (tripWithImages.hotels ?? []).map((h) => ({
      name: h.hotel_name,
      address: h.hotel_address,
      price: h.price_per_night,
      image: safeImage(
        h.hotel_image_url,
        `${h.hotel_name} ${h.hotel_address} ${tripWithImages.destination}`,
        "hotel",
      ),
      rating: h.rating ?? 4.5,
      description: h.description || `Well-rated stay in ${destCity}.`,
      recommendationScore: h.recommendation_score,
      sourceMetadata: h.source_metadata,
      amenities: h.amenities ?? [],
      recommendationReasons: h.recommendation_reasons ?? [],
    })),
    restaurants: displayRestaurants(tripWithImages),
    days,
    mapMarkers: buildMapMarkers(tripWithImages),
    budgetBreakdown: (() => {
      const allocation = tripWithImages.optimization?.budget_allocation;
      if (!allocation) return [];
      const total = Object.values(allocation).reduce(
        (sum, value) => sum + value,
        0,
      );
      return Object.entries(allocation).map(([label, value]) => ({
        label:
          label === "emergency"
            ? "Emergency buffer"
            : label === "miscellaneous"
              ? "Miscellaneous"
              : label.charAt(0).toUpperCase() + label.slice(1),
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
        amount: formatCurrency(
          value,
          tripWithImages.budget,
          tripWithImages.currency_code,
        ),
      }));
    })(),
    budgetTiers,
    topAttractions: allActivities.slice(0, 6).map((a) => a.place_name),
    insights: [
      {
        label: "Weather",
        value: `Check forecast before departure to ${destCity}`,
      },
      { label: "Crowds", value: "Book popular attractions in advance" },
      {
        label: "Safety",
        value: "Keep copies of documents; use registered taxis",
      },
      { label: "Culture", value: `Learn basic greetings for ${destCity}` },
      {
        label: "Best season",
        value: "Shoulder seasons often offer better value",
      },
      { label: "Local tip", value: "Download offline maps before exploring" },
    ],
    packingItems: [
      "Passport & travel documents",
      "Comfortable walking shoes",
      "Universal power adapter",
      "Portable charger & cables",
      "Light rain jacket",
      "Sunscreen & sunglasses",
      "Reusable water bottle",
      "Basic first-aid kit",
      tripWithImages.group_size?.toLowerCase().includes("family")
        ? "Snacks & entertainment for kids"
        : "Day backpack",
      "Printed hotel confirmations",
    ],
    travelDocuments: [
      {
        item: "Valid passport (6+ months validity)",
        tip: "Check expiry date now",
      },
      {
        item: "Visa / entry requirements",
        tip: `Verify requirements for ${tripWithImages.destination}`,
      },
      {
        item: "Travel insurance policy",
        tip: "Covers medical, cancellation & baggage",
      },
      {
        item: "Flight & hotel confirmations",
        tip: "Save offline copies on your phone",
      },
      {
        item: "Emergency contact list",
        tip: "Include embassy and family contacts",
      },
      { item: "Driver's license / ID", tip: "Required for car rentals" },
    ],
    localEssentials: [
      { label: "Emergency", value: "112 (EU) · 911 (US) · check local number" },
      { label: "Currency", value: "Carry some local cash for small vendors" },
      {
        label: "Language",
        value: `Download offline translation for ${destCity}`,
      },
      {
        label: "Tipping",
        value: "Research local tipping customs before dining",
      },
      { label: "Connectivity", value: "eSIM or local SIM for maps & bookings" },
    ],
    transportation: [
      {
        mode: "Airport transfer",
        value: "Provider data unavailable",
        note: `Check a live route from the airport to ${destCity} before departure.`,
      },
      {
        mode: "Local transit",
        value: "Unavailable",
        note: "No road or transit provider is configured; distances are straight-line estimates.",
      },
      {
        mode: "Walking",
        value: `~${(allActivities.length * 1.2).toFixed(1)} km`,
        note: "Comfortable shoes recommended",
      },
      {
        mode: "Ride-share",
        value: "On demand",
        note: "Use official apps; verify plate number",
      },
    ],
    bookingChecklist: [
      { item: "Flights / transport to destination", booked: false },
      {
        item: `Hotel in ${destCity}`,
        booked: (tripWithImages.hotels?.length ?? 0) > 0,
      },
      ...allActivities.slice(0, 4).map((a) => ({
        item: `Tickets: ${a.place_name}`,
        booked: false,
      })),
      { item: "Travel insurance", booked: false },
      { item: "Airport transfer", booked: false },
    ],
    tripComparison: [
      {
        label: "Balanced",
        value: tripWithImages.budget,
        detail: `${tripWithImages.duration} · ${allActivities.length} attractions`,
        recommended: true,
      },
      {
        label: "Relaxed pace",
        value: formatCurrency(budgetNum * 1.1, tripWithImages.budget),
        detail: `${tripWithImages.duration} · fewer stops per day`,
      },
      {
        label: "Budget-friendly",
        value: formatCurrency(budgetNum * 0.75, tripWithImages.budget),
        detail: `${tripWithImages.duration} · more free activities`,
      },
    ],
    mapTip: `Cluster ${destCity} activities by neighborhood to reduce transit time between stops.`,
    transitMinutes: "Unavailable",
    walkDistance: "Unavailable",
    routeDistance:
      tripWithImages.optimization?.distance_source === "UNAVAILABLE"
        ? "Unavailable"
        : `${tripWithImages.optimization?.route_distance_km ?? 0} km`,
    distanceSaved: `${tripWithImages.optimization?.distance_saved_km ?? 0} km`,
    budgetActivityNames:
      tripWithImages.optimization?.budget_activity_names ??
      allActivities.map((activity) => activity.place_name),
    budgetActivityCost: tripWithImages.optimization?.budget_activity_cost ?? 0,
    qualityScore: tripWithImages.optimization?.quality_score,
    decisionReasons: tripWithImages.optimization?.decision_reasons ?? [],
    distanceSource: tripWithImages.optimization?.distance_source,
  };
}

export function exportTripAsJson(trip: TripInfo) {
  const blob = new Blob([JSON.stringify(trip, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip-${trip.destination.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
