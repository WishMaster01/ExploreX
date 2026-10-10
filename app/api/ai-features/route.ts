import {
  aiFeatureRequestSchema,
  aiFeatureAnswerSchema,
} from "@/lib/ai-schemas";
import {
  generateAiResponse,
  AiProviderConfigurationError,
  AiProviderTimeoutError,
} from "@/lib/ai/generate";
import {
  AI_FEATURE_PROMPT_VERSION,
  buildFeatureSystemPrompt,
  FEATURE_USER_DATA_PREFIX,
} from "@/lib/ai/prompts";
import { getAiFeature } from "@/lib/data/ai-features";
import { apiError, apiOk, readJson } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { APP_CONFIG } from "@/lib/config";
import { recordAiFeatureGeneration } from "@/lib/observability/ai-analytics";
import { serverLogger } from "@/lib/observability/server-logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import "server-only";

function sanitize(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C-\u001F\u007F]/g, " ")
    .replace(/\s{3,}/g, "  ")
    .trim()
    .slice(0, APP_CONFIG.ai.maxMessageChars);
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");

    const policy = APP_CONFIG.rateLimits.aiChat;
    const denied = await enforceRateLimit(request, {
      capacity: policy.capacity,
      interval: policy.interval,
      refillRate: policy.refillRate,
      requested: 1,
      userId: user.id,
    });
    if (denied) return denied;

    const parsed = aiFeatureRequestSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return apiError(
        "A valid feature and message history are required",
        400,
        "VALIDATION_ERROR",
      );
    const feature = getAiFeature(parsed.data.feature);
    if (!feature) return apiError("Unknown AI feature", 400, "BAD_REQUEST");

    const history = parsed.data.messages.map(({ role, content }) => ({
      role,
      content: sanitize(content),
    }));
    const generated = await generateAiResponse({
      feature: feature.key,
      systemPrompt: buildFeatureSystemPrompt(feature.systemPrompt),
      userContent: `${FEATURE_USER_DATA_PREFIX}${JSON.stringify(history)}`,
      schema: aiFeatureAnswerSchema,
      maxTokens: 1_200,
      jsonMode: false,
      onMetrics: (metrics) =>
        recordAiFeatureGeneration(user.id, metrics, AI_FEATURE_PROMPT_VERSION),
    });
    return apiOk({
      answer: generated.data,
      feature: feature.key,
      generation_metadata: {
        prompt_version: AI_FEATURE_PROMPT_VERSION,
        provider: generated.metrics.provider,
        model: generated.metrics.model,
        request_id: generated.metrics.requestId,
        latency_ms: generated.metrics.latencyMs,
        prompt_tokens: generated.metrics.promptTokens,
        completion_tokens: generated.metrics.completionTokens,
        estimated_cost_usd: generated.metrics.estimatedCostUsd,
        retry_count: generated.metrics.retryCount,
      },
    });
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
    serverLogger.error("ai.feature_failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return apiError(
      "AI provider could not process a valid response",
      502,
      "AI_PROVIDER_ERROR",
    );
  }
}
