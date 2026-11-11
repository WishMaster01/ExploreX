import { randomUUID } from "node:crypto";
import type { KnowledgeEvidence } from "@/lib/rag/retrieve";
import type { AgentPlannerState } from "./state";
import type { ExtractedPreferences } from "./schemas";
import type { ValidTripInfo } from "@/lib/domain/schemas";

export const testPreferences: ExtractedPreferences = {
  origin: "Delhi",
  destination: "Jaipur",
  group_size: "2 people",
  budget: "10000 INR",
  duration: "1 day",
  interests: ["heritage"],
  requirements: [],
  currency_code: "INR",
};

export const testPlan: ValidTripInfo = {
  destination: "Jaipur",
  origin: "Delhi",
  group_size: "2 people",
  budget: "10000 INR",
  duration: "1 day",
  currency_code: "INR",
  hotels: [
    {
      hotel_name: "Test Heritage Hotel",
      hotel_address: "1 Test Road, Jaipur",
      price_per_night: "1000 INR",
      hotel_image_url: "",
      geo_coordinates: { latitude: 26.9, longitude: 75.8 },
      rating: 4,
      description: "A sourced sample accommodation.",
    },
  ],
  itinerary: [
    {
      day: 1,
      day_plan: "Visit the sourced heritage site.",
      best_time_to_visit_day: "Morning",
      activities: [
        {
          place_name: "Test Heritage Site",
          place_details: "A sourced sample place.",
          place_image_url: "",
          geo_coordinates: { latitude: 26.91, longitude: 75.81 },
          place_address: "2 Test Road, Jaipur",
          ticket_pricing: "100 INR",
          time_travel_each_location: "15 minutes estimated",
          best_time_to_visit: "Morning",
          estimated_cost: 100,
          visit_duration_minutes: 60,
        },
      ],
    },
  ],
};

export const sufficientEvidence: KnowledgeEvidence[] = [
  evidence("destination", "Jaipur", ["destination_identity"]),
  evidence("place", "Test Heritage Site", [
    "place_name",
    "place_coordinates",
    "place_address",
    "place_details",
  ]),
  evidence("place-two", "Test Museum", ["place_name"]),
  evidence("place-three", "Test Garden", ["place_name"]),
  evidence("hotel", "Test Heritage Hotel", [
    "accommodation",
    "accommodation_price",
    "accommodation_coordinates",
    "accommodation_rating",
    "accommodation_address",
  ]),
];

function evidence(
  id: string,
  title: string,
  factTypes: string[],
): KnowledgeEvidence {
  return {
    id,
    documentId: id,
    chunkId: id,
    sourceDocumentId: `${id}-source-doc`,
    contentHash: `${id}-hash`,
    version: 1,
    title,
    content: `${title}, Jaipur`,
    destinationId: "jaipur-in",
    categoryIds: [],
    factTypes,
    verificationStatus: "VERIFIED",
    sourceUrl: "https://example.org/source",
    attribution: "Test attribution",
    license: "Test license",
    storagePolicy: "Factual test fixture",
    lastVerifiedAt: "2026-11-01",
    sourceId: "test-source",
    sourceName: "Test source",
    score: 1,
    retrievalMethods: ["keyword"],
    retrievedAt: new Date().toISOString(),
  };
}

export function makePlannerState(
  overrides: Partial<AgentPlannerState> = {},
): AgentPlannerState {
  return {
    stateVersion: 1,
    request: {
      schemaVersion: "1.0",
      messages: [
        {
          role: "user",
          content:
            "Plan a one day Jaipur trip from Delhi for two people, budget 10000 INR.",
        },
      ],
    },
    runId: randomUUID(),
    ownerId: null,
    startedAtMs: Date.now(),
    stepCount: 0,
    trace: [],
    taskAttempts: {},
    failureCode: null,
    preferences: undefined,
    evidence: [],
    missingEvidence: [],
    candidateAttempt: 0,
    candidate: undefined,
    plan: undefined,
    validation: { passed: false, errors: [], warnings: [] },
    warnings: [],
    modelCalls: [],
    response: undefined,
    ...overrides,
  };
}
