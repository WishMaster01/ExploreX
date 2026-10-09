export const APP_CONFIG = {
  ai: {
    model: "openai/gpt-4.1-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    timeoutMs: 45_000,
    retries: 2,
    chatMaxMessages: 40,
    featureMaxMessages: 16,
    maxMessageChars: 4_000,
  },
  cache: {
    aiEntries: 100,
    aiTtlMs: 30 * 60_000,
    destinationEntries: 100,
    destinationTtlMs: 10 * 60_000,
  },
  queue: {
    aiConcurrency: 3,
    aiMaxPending: 75,
    featureConcurrency: 3,
    featureMaxPending: 60,
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
  },
} as const;
