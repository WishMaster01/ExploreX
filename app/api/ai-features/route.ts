import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { aiFeatureRequestSchema } from "@/lib/domain/schemas";
import { aiFeatureKeys, getAiFeature } from "@/lib/data/ai-features";
import { apiError, apiOk, serverError } from "@/lib/api";
import {
  AsyncRequestQueue,
  withExponentialBackoff,
} from "@/lib/async-request-queue";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { serverLogger } from "@/lib/observability/server-logger";
import "server-only";

const featureQueue = new AsyncRequestQueue(
  APP_CONFIG.queue.featureConcurrency,
  APP_CONFIG.queue.featureMaxPending,
);

function sanitize(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      capacity: 30,
      interval: 3600,
      refillRate: 15,
      requested: 1,
      userId: user.id,
    });
    if (denied) return denied;

    const parsed = aiFeatureRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError(
        "A valid feature and message history are required",
        400,
        "BAD_REQUEST",
      );

    const feature = getAiFeature(parsed.data.feature);
    if (!feature) return apiError("Unknown AI feature", 400, "BAD_REQUEST");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      return apiError(
        "AI provider is not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );

    const openai = new OpenAI({
      apiKey,
      baseURL: APP_CONFIG.ai.baseUrl,
      timeout: APP_CONFIG.ai.timeoutMs,
    });

    const messages: ChatCompletionMessageParam[] = parsed.data.messages.map(
      (message) => ({
        role: message.role,
        content: sanitize(message.content),
      }),
    );

    const answer = await featureQueue.run(() =>
      withExponentialBackoff(
        async () => {
          const completion = await openai.chat.completions.create({
            model: APP_CONFIG.ai.model,
            max_tokens: 1_200,
            messages: [
              { role: "system", content: feature.systemPrompt },
              ...messages,
            ],
          });
          const content = completion.choices[0]?.message?.content?.trim();
          if (!content)
            throw new Error("AI returned an empty feature response");
          return content;
        },
        { retries: APP_CONFIG.ai.retries },
      ),
    );

    void prisma.analyticsEvent
      .create({
        data: {
          type: "ai_feature",
          success: true,
          userId: user.id,
          metadata: { feature: feature.key },
        },
      })
      .catch(() =>
        serverLogger.warn("analytics.write_failed", {
          event: "ai_feature",
          success: true,
        }),
      );
    return apiOk({ answer, feature: feature.key });
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
    if (
      error instanceof OpenAI.APIError &&
      (error.status === 408 || error.status === 504)
    ) {
      return apiError("AI provider timed out", 504, "PROVIDER_TIMEOUT");
    }
    return apiError(
      "AI provider could not complete the request",
      502,
      "AI_PROVIDER_ERROR",
    );
  }
}
