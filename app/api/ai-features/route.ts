import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { aiFeatureKeys, getAiFeature } from "@/lib/data/ai-features";
import { apiError, apiOk, serverError } from "@/lib/api";
import { AsyncRequestQueue, withExponentialBackoff } from "@/lib/async-request-queue";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  feature: z.enum(aiFeatureKeys),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })).min(1).max(16),
});

const featureQueue = new AsyncRequestQueue(3, 60);
const MODEL = "openai/gpt-4.1-mini";

function sanitize(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user) return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      capacity: 30, interval: 3600, refillRate: 15, requested: 1, userId: user.id,
    });
    if (denied) return denied;

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("A valid feature and message history are required", 400, "BAD_REQUEST");
    const feature = getAiFeature(parsed.data.feature);
    if (!feature) return apiError("Unknown AI feature", 400, "BAD_REQUEST");
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return apiError("AI provider is not configured", 503, "SERVICE_UNAVAILABLE");

    const openai = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
    const messages: ChatCompletionMessageParam[] = parsed.data.messages.map((message) => ({
      role: message.role,
      content: sanitize(message.content),
    }));
    const answer = await featureQueue.run(() => withExponentialBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        max_tokens: 1_200,
        messages: [{ role: "system", content: feature.systemPrompt }, ...messages],
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("AI returned an empty feature response");
      return content;
    }, { retries: 2 }));

    void prisma.analyticsEvent.create({
      data: { type: "ai_feature", success: true, userId: user.id, metadata: { feature: feature.key } },
    }).catch((error) => console.error("Unable to record AI feature analytics", error));
    return apiOk({ answer, feature: feature.key });
  } catch (error) {
    if (error instanceof Error && error.message === "AI request queue is full") {
      return apiError("AI service is busy; try again shortly", 503, "SERVICE_UNAVAILABLE");
    }
    return serverError(error, "Error running AI feature agent");
  }
}

