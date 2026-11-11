import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { chatHistorySchema, chatResponseSchema } from "@/lib/ai-schemas";
import {
  AiProviderConfigurationError,
  AiProviderTimeoutError,
  generateAiResponse,
} from "@/lib/ai/generate";
import {
  buildTripSystemPrompt,
  untrustedPreferencesMessage,
} from "@/lib/ai/prompts";
import { APP_CONFIG } from "@/lib/config";
import { apiError, apiOk, readJson } from "@/lib/api";
import { recordAiGeneration } from "@/lib/observability/ai-analytics";
import { serverLogger } from "@/lib/observability/server-logger";
import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  AgentRunPersistenceError,
  runAgentTripPlanner,
} from "@/lib/agent-planner/graph";
import "server-only";

const requestSchema = z
  .object({
    schemaVersion: z.literal("1.0").optional(),
    messages: chatHistorySchema.max(APP_CONFIG.ai.chatMaxMessages),
    isFinal: z.boolean().optional(),
  })
  .strict();

async function handlePost(request: Request) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    if (!authResult.userId)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    userId = authResult.userId;

    const parsed = requestSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return apiError(
        "A valid message history is required",
        400,
        "VALIDATION_ERROR",
      );
    const isFinal = parsed.data.isFinal === true;
    if (isFinal && parsed.data.schemaVersion !== "1.0")
      return apiError(
        "Unsupported planner response version",
        400,
        "VALIDATION_ERROR",
      );
    const messages = parsed.data.messages.map((message) => ({
      ...message,
      content: message.content
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s{3,}/g, "  ")
        .trim()
        .slice(0, APP_CONFIG.ai.maxMessageChars),
    }));
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

    if (isFinal)
      return apiOk(
        await runAgentTripPlanner({ schemaVersion: "1.0", messages }, userId),
      );

    const chat = await generateAiResponse({
      feature: "trip-chat",
      systemPrompt: buildTripSystemPrompt(false),
      userContent: untrustedPreferencesMessage(messages),
      schema: chatResponseSchema,
      maxTokens: 1_000,
      jsonMode: true,
      onMetrics: (metrics) =>
        recordAiGeneration(userId!, metrics, "trip-chat-v1"),
    });
    return apiOk(chat.data);
  } catch (error) {
    if (error instanceof AgentRunPersistenceError) {
      serverLogger.error("agent.run_persistence_failed", {
        reason: "database_unavailable",
      });
      return apiError(
        "Planner execution could not be recorded",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    if (
      error instanceof Error &&
      error.message === "AI request queue is full"
    ) {
      serverLogger.warn("ai.queue.rejected", {
        queue: "ai",
        errorCode: "QUEUE_FULL",
      });
      return apiError(
        "AI service is busy; try again shortly",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    if (error instanceof AiProviderConfigurationError)
      return apiError(
        "AI provider is not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    if (error instanceof AiProviderTimeoutError)
      return apiError("AI provider timed out", 504, "PROVIDER_TIMEOUT");
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

export function POST(request: Request) {
  return withRequestMetrics(request, "POST /api/aimodel", () =>
    handlePost(request),
  );
}
