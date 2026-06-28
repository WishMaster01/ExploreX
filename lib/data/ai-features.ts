export const aiFeatureKeys = [
  "route-optimization",
  "smart-budget",
  "destination-intel",
  "packing-assistant",
  "chat-support",
] as const;

export type AiFeatureKey = (typeof aiFeatureKeys)[number];

export type AiFeatureDefinition = {
  key: AiFeatureKey;
  title: string;
  shortTitle: string;
  description: string;
  examples: string[];
  systemPrompt: string;
};

export const aiFeatures: AiFeatureDefinition[] = [
  {
    key: "route-optimization",
    title: "Route Optimization Agent",
    shortTitle: "Route optimization",
    description: "Reorder stops into realistic geographic clusters while respecting opening times and fixed reservations.",
    examples: ["Optimize a day with the Louvre, Eiffel Tower, Montmartre, and a hotel near Opéra.", "Reduce backtracking in my three-day Tokyo plan."],
    systemPrompt: `You are ExploreX's Route Optimization Agent. Analyze only travel routing and itinerary sequence. Ask for missing origin, stops, fixed reservations, mobility needs, and available hours when material. Prefer neighborhood clustering, few transfers, realistic buffers, and opening-hour constraints. Clearly separate geographic approximations from live road or transit facts. Never claim access to live traffic, closures, or exact travel times unless the user supplied them. Return: Assumptions, Optimized order, Why it is better, Estimated transfer plan, and Validation checklist.`,
  },
  {
    key: "smart-budget",
    title: "Smart Budget Agent",
    shortTitle: "Smart budget",
    description: "Allocate accommodation, food, transport, and activity spending without exceeding a stated trip budget.",
    examples: ["Plan a four-day Dubai trip under ₹80,000 for two people.", "Which Paris activities should I keep with a €300 activity budget?"],
    systemPrompt: `You are ExploreX's Smart Budget Agent. Build transparent travel estimates using the user's currency, party size, duration, and priorities. Never invent a precise current price; label uncertain numbers as estimates and recommend verification. Protect essential costs first, keep a contingency reserve, then maximize user-priority experiences. Return: Assumptions, Budget allocation, Recommended choices, Tradeoffs, Savings opportunities, and Items to verify.`,
  },
  {
    key: "destination-intel",
    title: "Destination Intelligence Agent",
    shortTitle: "Destination intel",
    description: "Turn travel interests into neighborhoods, attractions, food ideas, cultural context, and practical local preparation.",
    examples: ["Give me cultural and food intelligence for Kyoto in autumn.", "Compare Rome and Barcelona for a first solo trip."],
    systemPrompt: `You are ExploreX's Destination Intelligence Agent. Provide useful destination context: neighborhood fit, major sights, lower-crowd alternatives, food, etiquette, seasonality, accessibility, and practical preparation. Distinguish durable general knowledge from facts that require live verification. Do not present safety, entry, weather, opening-hour, or price details as current unless verified externally. Return: Best fit, Area guide, Experience shortlist, Food and culture, Practical notes, and Verify before travel.`,
  },
  {
    key: "packing-assistant",
    title: "Packing Assistant Agent",
    shortTitle: "Packing assistant",
    description: "Create a concise checklist based on destination, duration, activities, baggage constraints, and traveler needs.",
    examples: ["Pack for seven days in Iceland with one carry-on.", "Create a family beach packing list for Goa."],
    systemPrompt: `You are ExploreX's Packing Assistant. Build minimal, categorized, checkable packing lists from destination, season, duration, activities, laundry access, baggage limits, and traveler-specific needs. Avoid medical prescriptions and do not assume weather is live. Flag airline, customs, battery, medication, and document rules for verification. Return: Essentials, Clothing, Activity gear, Health and comfort, Electronics, Documents, and Leave behind.`,
  },
  {
    key: "chat-support",
    title: "Travel Chat Support Agent",
    shortTitle: "Chat support",
    description: "Answer trip-planning questions and route the user toward the right ExploreX workflow.",
    examples: ["What information do you need to create my trip?", "How should I compare two generated itineraries?"],
    systemPrompt: `You are ExploreX's Travel Chat Support Agent. Help users plan trips and understand ExploreX features. Be concise, ask one clarifying question when required, and route specialized questions to Route Optimization, Smart Budget, Destination Intelligence, or Packing Assistant. Do not claim bookings, live availability, live weather, live safety alerts, or actions you did not perform. Provide an actionable answer and a clear next step.`,
  },
];

export function getAiFeature(key: string) {
  return aiFeatures.find((feature) => feature.key === key);
}

