export type TravelSignal = {
  slug: "weather" | "routes" | "safety" | "budget" | "high-altitude-prep";
  title: string;
  summary: string;
  disclaimer: string;
  sections: Array<{ title: string; description: string; points: string[] }>;
  sourceUrl?: string;
  sourceLabel?: string;
};

export const travelSignals: TravelSignal[] = [
  {
    slug: "weather",
    title: "Weather planning",
    summary:
      "Build resilient days around climate, daylight, rain probability, and heat exposure.",
    disclaimer:
      "ExploreX provides planning guidance, not a live forecast. Check an official local forecast before departure.",
    sections: [
      {
        title: "Before booking",
        description:
          "Compare seasonal patterns instead of relying on one idealized temperature.",
        points: [
          "Review rainfall and storm seasons.",
          "Check sunrise and sunset for outdoor plans.",
          "Account for altitude, humidity, and wind exposure.",
        ],
      },
      {
        title: "Daily adaptation",
        description:
          "Keep indoor alternatives near weather-sensitive activities.",
        points: [
          "Place exposed walks earlier on hot days.",
          "Keep museums or markets as rain fallbacks.",
          "Recheck alerts before long hikes or water activities.",
        ],
      },
    ],
  },
  {
    slug: "routes",
    title: "Route intelligence",
    summary:
      "Reduce transfers and backtracking by clustering stops and respecting real visit windows.",
    disclaimer:
      "Route estimates in generated plans use geographic distance, not live traffic or road-network navigation.",
    sections: [
      {
        title: "Cluster first",
        description:
          "A shorter stop list in one district often produces a better day than crossing a city repeatedly.",
        points: [
          "Group attractions by neighborhood.",
          "Anchor the day around timed reservations.",
          "Include hotel-to-first-stop and final return travel.",
        ],
      },
      {
        title: "Validate locally",
        description:
          "Use an official navigation provider for turn-by-turn travel and service disruptions.",
        points: [
          "Check transit closures and strike notices.",
          "Allow transfer and accessibility buffers.",
          "Avoid tight connections after major events.",
        ],
      },
    ],
  },
  {
    slug: "safety",
    title: "Travel safety",
    summary:
      "Use destination-aware preparation, verified transport, document backups, and current official advisories.",
    disclaimer:
      "This content is general preparation guidance and does not replace government travel advisories or emergency services.",
    sections: [
      {
        title: "Preparation",
        description: "Small steps reduce avoidable disruption.",
        points: [
          "Store offline copies of key documents.",
          "Share the itinerary with a trusted contact.",
          "Record local emergency and embassy contacts.",
        ],
      },
      {
        title: "On the ground",
        description: "Use situational awareness without overstating risk.",
        points: [
          "Use registered transport services.",
          "Protect valuables in crowded areas.",
          "Follow local laws, weather closures, and official alerts.",
        ],
      },
    ],
  },
  {
    slug: "budget",
    title: "Budget signals",
    summary:
      "Estimate total trip cost using accommodation, food, transport, activities, fees, and a contingency reserve.",
    disclaimer:
      "Displayed figures are planning estimates. Prices, taxes, exchange rates, and availability can change.",
    sections: [
      {
        title: "Build a complete baseline",
        description:
          "A realistic budget includes more than flights and hotels.",
        points: [
          "Separate fixed bookings from daily spending.",
          "Include local transport, taxes, and booking fees.",
          "Keep a contingency reserve of 10–15%.",
        ],
      },
      {
        title: "Prioritize value",
        description:
          "Protect high-value experiences before spending on interchangeable items.",
        points: [
          "Set an activity allocation before selecting tickets.",
          "Compare hotel location savings against room price.",
          "Track per-person and shared group costs separately.",
        ],
      },
    ],
  },
  {
    slug: "high-altitude-prep",
    title: "High-altitude preparation",
    summary:
      "Plan a gradual ascent, recognize altitude-illness symptoms early, and know when to stop climbing and descend.",
    disclaimer:
      "General travel-health information only. It cannot assess personal risk or replace advice from a qualified clinician. Seek urgent local medical help for severe or worsening symptoms.",
    sourceUrl:
      "https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/high-altitude-travel-and-altitude-illness.html",
    sourceLabel: "CDC Yellow Book: High-Altitude Travel and Altitude Illness",
    sections: [
      {
        title: "Before you go",
        description:
          "Make an altitude plan before booking a fast ascent or remote trek.",
        points: [
          "Talk with a travel-health clinician about your route, sleeping elevations, and medical history, especially if you have heart or lung disease, sleep-disordered breathing, or a previous altitude illness.",
          "Ask the clinician whether preventive medicine is appropriate for you; do not start or change altitude medicines without professional advice.",
          "Build acclimatization days into the itinerary and identify lower-elevation stops, medical facilities, and evacuation options along remote routes.",
          "Pack your regular medicines, a written health summary, travel-insurance details, and local emergency contacts.",
        ],
      },
      {
        title: "Ascend gradually",
        description:
          "Give your body time to adjust, especially the altitude where you sleep.",
        points: [
          "Avoid going from a low elevation to a sleeping elevation above 9,000 ft (2,750 m) in a single day when your itinerary can be changed.",
          "Above 9,000 ft, increase sleeping elevation by no more than about 1,600 ft (500 m) per day; plan an extra acclimatization day for each 3,300 ft (1,000 m) gained.",
          "Consider daytime excursions to higher points while returning to a lower elevation to sleep.",
          "For the first 48 hours above 8,000 ft (2,450 m), avoid alcohol and strenuous exercise while acclimatizing.",
        ],
      },
      {
        title: "Recognize early altitude illness",
        description:
          "Acute mountain sickness often feels like a headache or hangover after ascent.",
        points: [
          "Watch for headache, unusual tiredness, dizziness, reduced appetite, nausea, or vomiting after reaching a higher elevation.",
          "Stop ascending if symptoms appear. Rest at the same elevation and do not sleep higher while symptoms continue.",
          "If symptoms worsen despite resting, descend and get medical help; do not leave a symptomatic traveler alone.",
          "Children may show irritability or reduced activity instead of being able to describe symptoms clearly.",
        ],
      },
      {
        title: "Emergency signs: descend and get help",
        description:
          "Severe altitude illness can become life-threatening and needs urgent action.",
        points: [
          "Confusion, unusual drowsiness, loss of coordination, or difficulty walking can indicate brain swelling (HACE). Begin immediate descent and seek emergency care.",
          "Shortness of breath while resting, worsening cough, marked weakness, or blue/gray lips can indicate fluid in the lungs (HAPE). Begin immediate descent and seek emergency care.",
          "Keep the person warm and minimize exertion during evacuation. Use supplemental oxygen if available, but do not delay descent or professional care to find it.",
          "If descent is temporarily impossible, contact local rescue or medical services for instructions; do not rely on a travel checklist as treatment.",
        ],
      },
    ],
  },
];

export function getTravelSignal(slug: string) {
  return travelSignals.find((signal) => signal.slug === slug);
}
