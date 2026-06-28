export type TravelSignal = {
  slug: "weather" | "routes" | "safety" | "budget";
  title: string;
  summary: string;
  disclaimer: string;
  sections: Array<{ title: string; description: string; points: string[] }>;
};

export const travelSignals: TravelSignal[] = [
  {
    slug: "weather", title: "Weather planning", summary: "Build resilient days around climate, daylight, rain probability, and heat exposure.", disclaimer: "ExploreX provides planning guidance, not a live forecast. Check an official local forecast before departure.",
    sections: [
      { title: "Before booking", description: "Compare seasonal patterns instead of relying on one idealized temperature.", points: ["Review rainfall and storm seasons.", "Check sunrise and sunset for outdoor plans.", "Account for altitude, humidity, and wind exposure."] },
      { title: "Daily adaptation", description: "Keep indoor alternatives near weather-sensitive activities.", points: ["Place exposed walks earlier on hot days.", "Keep museums or markets as rain fallbacks.", "Recheck alerts before long hikes or water activities."] },
    ],
  },
  {
    slug: "routes", title: "Route intelligence", summary: "Reduce transfers and backtracking by clustering stops and respecting real visit windows.", disclaimer: "Route estimates in generated plans use geographic distance, not live traffic or road-network navigation.",
    sections: [
      { title: "Cluster first", description: "A shorter stop list in one district often produces a better day than crossing a city repeatedly.", points: ["Group attractions by neighborhood.", "Anchor the day around timed reservations.", "Include hotel-to-first-stop and final return travel."] },
      { title: "Validate locally", description: "Use an official navigation provider for turn-by-turn travel and service disruptions.", points: ["Check transit closures and strike notices.", "Allow transfer and accessibility buffers.", "Avoid tight connections after major events."] },
    ],
  },
  {
    slug: "safety", title: "Travel safety", summary: "Use destination-aware preparation, verified transport, document backups, and current official advisories.", disclaimer: "This content is general preparation guidance and does not replace government travel advisories or emergency services.",
    sections: [
      { title: "Preparation", description: "Small steps reduce avoidable disruption.", points: ["Store offline copies of key documents.", "Share the itinerary with a trusted contact.", "Record local emergency and embassy contacts."] },
      { title: "On the ground", description: "Use situational awareness without overstating risk.", points: ["Use registered transport services.", "Protect valuables in crowded areas.", "Follow local laws, weather closures, and official alerts."] },
    ],
  },
  {
    slug: "budget", title: "Budget signals", summary: "Estimate total trip cost using accommodation, food, transport, activities, fees, and a contingency reserve.", disclaimer: "Displayed figures are planning estimates. Prices, taxes, exchange rates, and availability can change.",
    sections: [
      { title: "Build a complete baseline", description: "A realistic budget includes more than flights and hotels.", points: ["Separate fixed bookings from daily spending.", "Include local transport, taxes, and booking fees.", "Keep a contingency reserve of 10–15%."] },
      { title: "Prioritize value", description: "Protect high-value experiences before spending on interchangeable items.", points: ["Set an activity allocation before selecting tickets.", "Compare hotel location savings against room price.", "Track per-person and shared group costs separately."] },
    ],
  },
];

export function getTravelSignal(slug: string) {
  return travelSignals.find((signal) => signal.slug === slug);
}
