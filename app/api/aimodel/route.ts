import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  aiGenerationMetadataSchema,
  chatResponseSchema,
  finalResponseSchema,
} from "@/lib/ai-schemas";
import {
  generateAiResponse,
  AiProviderConfigurationError,
  AiProviderTimeoutError,
} from "@/lib/ai/generate";
import type { AiGenerationMetrics } from "@/lib/ai/generate";
import { createTripPlanCacheKey } from "@/lib/ai/cache-key";
import {
  buildTripSystemPrompt,
  TRIP_PLANNER_PROMPT_VERSION,
  untrustedPreferencesMessage,
} from "@/lib/ai/prompts";
import { APP_CONFIG } from "@/lib/config";
import { apiError, apiOk, readJson } from "@/lib/api";
import { chatHistorySchema } from "@/lib/domain/schemas";
import type { ValidTripInfo } from "@/lib/domain/schemas";
import { LruTtlCache } from "@/lib/algorithms/cache/lru-ttl-cache";
import { recordAiGeneration } from "@/lib/observability/ai-analytics";
import { serverLogger } from "@/lib/observability/server-logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { optimizeTripPlan } from "@/lib/trip-optimizer";
import { attachTravelSources } from "@/lib/travel-data/verify-plan";
import "server-only";

type CachedTripCandidate = {
  plan: ValidTripInfo;
  metrics: AiGenerationMetrics;
};

const responseCache = new LruTtlCache<CachedTripCandidate>(
  APP_CONFIG.cache.aiEntries,
  APP_CONFIG.cache.aiTtlMs,
);

const requestSchema = z
  .object({
    messages: chatHistorySchema.max(APP_CONFIG.ai.chatMaxMessages),
    isFinal: z.boolean().optional(),
  })
  .strict();

function makeCacheKey(
  userId: string,
  messages: z.infer<typeof chatHistorySchema>,
) {
  return createTripPlanCacheKey({
    userId,
    promptVersion: TRIP_PLANNER_PROMPT_VERSION,
    model: APP_CONFIG.ai.model,
    messages,
  });
}

function generationMetadata(
  metrics: Awaited<ReturnType<typeof generateAiResponse>>["metrics"],
  verifiedPlaceCount: number,
  travelDataProvider: string,
  cacheHit: boolean,
) {
  return aiGenerationMetadataSchema.parse({
    promptVersion: TRIP_PLANNER_PROMPT_VERSION,
    model: metrics.model,
    provider: metrics.provider,
    feature: metrics.feature,
    requestId: metrics.requestId,
    latencyMs: metrics.latencyMs,
    promptTokens: metrics.promptTokens,
    completionTokens: metrics.completionTokens,
    estimatedCostUsd: metrics.estimatedCostUsd,
    retryCount: metrics.retryCount,
    cacheHit,
    verifiedPlaceCount,
    travelDataProvider,
  });
}

async function finalizeTripPlan(
  candidate: ValidTripInfo,
  metrics: AiGenerationMetrics,
  cacheHit: boolean,
) {
  const retrieved = await attachTravelSources(candidate);
  const optimized = optimizeTripPlan(retrieved.plan);
  return finalResponseSchema.parse({
    trip_plan: {
      ...optimized,
      optimization: optimized.optimization
        ? {
            ...optimized.optimization,
            source_metadata: {
              source:
                optimized.optimization.distance_source === "PROVIDER_ROUTE"
                  ? "VERIFIED"
                  : optimized.optimization.distance_source === "MIXED_ESTIMATE"
                    ? "ESTIMATED"
                    : optimized.optimization.distance_source === "UNAVAILABLE"
                      ? "UNAVAILABLE"
                      : "ESTIMATED",
              provider: null,
              retrievedAt: null,
              note:
                optimized.optimization.distance_source === "PROVIDER_ROUTE"
                  ? "Distance returned by the configured route provider. Travel time is not supplied by this distance estimate."
                  : optimized.optimization.distance_source === "MIXED_ESTIMATE"
                    ? "Some legs use route provider distances and missing legs use straight-line estimates."
                    : optimized.optimization.distance_source === "UNAVAILABLE"
                      ? "No usable route coordinates were available."
                      : "Straight-line distance from itinerary coordinates; not road or transit routing.",
            },
          }
        : undefined,
      generation_metadata: generationMetadata(
        metrics,
        retrieved.verifiedCount,
        retrieved.provider,
        cacheHit,
      ),
      budget_source_metadata: {
        source: "AI_GENERATED",
        provider: "openrouter",
        retrievedAt: null,
        note: "Budget breakdowns and prices are planning estimates, not current quotes.",
      },
    },
  });
}

export async function POST(request: Request) {
  let clerkUserId: string | null = null;
  let isFinal = false;
  try {
    const { userId } = await auth();
    if (!userId)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    clerkUserId = userId;

    const parsedRequest = requestSchema.safeParse(await readJson(request));
    if (!parsedRequest.success)
      return apiError(
        "A valid message history is required",
        400,
        "VALIDATION_ERROR",
      );
    const messages = parsedRequest.data.messages.map((message) => ({
      ...message,
      content: message.content
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s{3,}/g, "  ")
        .trim()
        .slice(0, APP_CONFIG.ai.maxMessageChars),
    }));
    isFinal = parsedRequest.data.isFinal === true;

    const policy = isFinal
      ? APP_CONFIG.rateLimits.aiFinal
      : APP_CONFIG.rateLimits.aiChat;
    const denied = await enforceRateLimit(request, {
      capacity: policy.capacity,
      interval: policy.interval,
      refillRate: policy.refillRate,
      requested: isFinal ? 2 : 1,
      userId,
    });
    if (denied) return denied;

    const key = isFinal ? makeCacheKey(userId, messages) : null;
    if (key) {
      const cached = await responseCache.get(key);
      if (cached) {
        const data = await finalizeTripPlan(cached.plan, cached.metrics, true);
        const currentCacheMetrics: AiGenerationMetrics = {
          requestId: randomUUID(),
          provider: "openrouter",
          model: cached.metrics.model,
          feature: "trip-planner",
          latencyMs: 0,
          promptTokens: null,
          completionTokens: null,
          estimatedCostUsd: null,
          retryCount: 0,
          success: true,
        };
        recordAiGeneration(
          userId,
          currentCacheMetrics,
          TRIP_PLANNER_PROMPT_VERSION,
          true,
        );
        serverLogger.info("ai.cache.hit", {
          feature: "trip-planner",
          cacheHit: true,
        });
        return apiOk(data);
      }
    }
    if (isFinal)
      serverLogger.info("ai.cache.miss", {
        feature: "trip-planner",
        cacheHit: false,
      });

    const userContent = untrustedPreferencesMessage(messages);
    const onMetrics = (metrics: Parameters<typeof recordAiGeneration>[1]) =>
      recordAiGeneration(userId, metrics, TRIP_PLANNER_PROMPT_VERSION);
    if (!isFinal) {
      const chat = await generateAiResponse({
        feature: "trip-chat",
        systemPrompt: buildTripSystemPrompt(false),
        userContent,
        schema: chatResponseSchema,
        maxTokens: 1_000,
        jsonMode: true,
        onMetrics,
      });
      return apiOk(chat.data);
    }

    const generated = await generateAiResponse({
      feature: "trip-planner",
      systemPrompt: buildTripSystemPrompt(true),
      userContent,
      schema: finalResponseSchema,
      maxTokens: 6_000,
      jsonMode: true,
      onMetrics,
    });
    const candidate = generated.data.trip_plan;
    const response = await finalizeTripPlan(
      candidate,
      generated.metrics,
      false,
    );
    if (key)
      await responseCache.set(key, {
        plan: candidate,
        metrics: generated.metrics,
      });
    return apiOk(response);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "AI request queue is full"
    ) {
      return apiError(
        "AI service is busy; try again shortly",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    if (error instanceof AiProviderConfigurationError) {
      return apiError(
        "AI provider is not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    if (error instanceof AiProviderTimeoutError) {
      return apiError("AI provider timed out", 504, "PROVIDER_TIMEOUT");
    }
    serverLogger.error("ai.generation_failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return apiError(
      "AI provider could not process a valid response",
      502,
      "AI_PROVIDER_ERROR",
    );
  }
}
