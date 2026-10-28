import { getServerEnvironment } from "@/lib/env";

export const APP_CONFIG = {
  api: {
    maxJsonBodyBytes: 256_000,
  },
  ai: {
    model: "openai/gpt-4.1-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    timeoutMs: 45_000,
    retries: 2,
    retryBaseDelayMs: 350,
    chatMaxMessages: 40,
    featureMaxMessages: 16,
    maxMessageChars: 4_000,
    inputCostPerMillionUsd: optionalPositiveNumber(
      getServerEnvironment().OPENROUTER_INPUT_COST_PER_MILLION?.toString(),
    ),
    outputCostPerMillionUsd: optionalPositiveNumber(
      getServerEnvironment().OPENROUTER_OUTPUT_COST_PER_MILLION?.toString(),
    ),
  },
  travelData: {
    timeoutMs: 5_000,
    maxVerifiedHotels: 3,
    maxVerifiedActivities: 5,
    maxVerifiedRestaurants: 5,
  },
  cache: {
    aiEntries: 100,
    aiTtlMs: 30 * 60_000,
    destinationEntries: 100,
    destinationTtlMs: 10 * 60_000,
    siteDatasetEntries: 20,
    siteDatasetTtlMs: 5 * 60_000,
  },
  queue: {
    aiConcurrency: 3,
    aiMaxPending: 75,
    featureConcurrency: 3,
    featureMaxPending: 60,
    travelDataConcurrency: 3,
    travelDataMaxPending: 24,
  },
  pagination: {
    defaultTrips: 12,
    maxTrips: 30,
    defaultDestinations: 8,
    maxDestinations: 12,
  },
  rateLimits: {
    tripRead: { capacity: 120, interval: 3_600, refillRate: 60 },
    tripWrite: { capacity: 20, interval: 3_600, refillRate: 10 },
    aiChat: { capacity: 30, interval: 3_600, refillRate: 15 },
    aiFinal: { capacity: 5, interval: 3_600, refillRate: 2 },
    destination: { capacity: 90, interval: 60, refillRate: 60 },
    weather: { capacity: 30, interval: 60, refillRate: 20 },
    reminderRead: { capacity: 120, interval: 3_600, refillRate: 60 },
    reminderWrite: { capacity: 30, interval: 3_600, refillRate: 15 },
  },
  reminders: {
    maxScheduleAheadMs: 2 * 365 * 24 * 60 * 60_000,
  },
} as const;

function optionalPositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
