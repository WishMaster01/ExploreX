import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import { APP_CONFIG } from "@/lib/config";
import {
  AsyncRequestQueue,
  withExponentialBackoff,
} from "@/lib/async-request-queue";
import { serverLogger } from "@/lib/observability/server-logger";
import { parseAiOutput } from "./validation";
import { MalformedAiOutputError } from "./errors";
import "server-only";

const aiQueue = new AsyncRequestQueue(
  APP_CONFIG.queue.aiConcurrency,
  APP_CONFIG.queue.aiMaxPending,
);

export type AiGenerationMetrics = {
  requestId: string;
  provider: "openrouter";
  model: string;
  feature: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  retryCount: number;
  success: boolean;
};

export class AiProviderConfigurationError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiProviderConfigurationError";
  }
}

export class AiProviderTimeoutError extends Error {
  constructor() {
    super("AI provider request timed out");
    this.name = "AiProviderTimeoutError";
  }
}

function isRetryable(error: unknown): boolean {
  if (
    error instanceof MalformedAiOutputError ||
    error instanceof AiProviderTimeoutError
  )
    return true;
  if (error instanceof OpenAI.APIConnectionError) return true;
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    return (
      status === 408 ||
      status === 409 ||
      status === 429 ||
      (status !== undefined && status >= 500)
    );
  }
  return false;
}

function usageNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function estimatedCostUsd(
  promptTokens: number | null,
  completionTokens: number | null,
) {
  const inputRate = APP_CONFIG.ai.inputCostPerMillionUsd;
  const outputRate = APP_CONFIG.ai.outputCostPerMillionUsd;
  if (
    promptTokens === null ||
    completionTokens === null ||
    inputRate === null ||
    outputRate === null
  )
    return null;
  return Number(
    (
      (promptTokens * inputRate + completionTokens * outputRate) /
      1_000_000
    ).toFixed(8),
  );
}

export async function generateAiResponse<T>(options: {
  feature: string;
  systemPrompt: string;
  userContent: string;
  schema: ZodType<T>;
  maxTokens: number;
  jsonMode: boolean;
  onMetrics?: (metrics: AiGenerationMetrics) => void;
}): Promise<{ data: T; metrics: AiGenerationMetrics }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiProviderConfigurationError();
  const client = new OpenAI({
    apiKey,
    baseURL: APP_CONFIG.ai.baseUrl,
    timeout: APP_CONFIG.ai.timeoutMs,
    maxRetries: 0,
  });
  const requestId = randomUUID();
  const startedAt = Date.now();
  let retryCount = 0;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;

  try {
    const data = await aiQueue.run(() =>
      withExponentialBackoff(
        async () => {
          try {
            const completion = await client.chat.completions.create({
              model: APP_CONFIG.ai.model,
              max_tokens: options.maxTokens,
              messages: [
                { role: "system", content: options.systemPrompt },
                { role: "user", content: options.userContent },
              ],
              ...(options.jsonMode
                ? { response_format: { type: "json_object" as const } }
                : {}),
            });
            const attemptPromptTokens = usageNumber(
              completion.usage?.prompt_tokens,
            );
            const attemptCompletionTokens = usageNumber(
              completion.usage?.completion_tokens,
            );
            promptTokens =
              attemptPromptTokens === null
                ? promptTokens
                : (promptTokens ?? 0) + attemptPromptTokens;
            completionTokens =
              attemptCompletionTokens === null
                ? completionTokens
                : (completionTokens ?? 0) + attemptCompletionTokens;
            const raw = completion.choices[0]?.message?.content?.trim();
            if (!raw) throw new MalformedAiOutputError();
            return parseAiOutput(raw, options.schema, options.jsonMode);
          } catch (error) {
            if (error instanceof OpenAI.APIConnectionTimeoutError)
              throw new AiProviderTimeoutError();
            throw error;
          }
        },
        {
          retries: APP_CONFIG.ai.retries,
          baseDelayMs: APP_CONFIG.ai.retryBaseDelayMs,
          shouldRetry: isRetryable,
          onRetry: () => {
            retryCount += 1;
          },
        },
      ),
    );
    const metrics: AiGenerationMetrics = {
      requestId,
      provider: "openrouter",
      model: APP_CONFIG.ai.model,
      feature: options.feature,
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      estimatedCostUsd: estimatedCostUsd(promptTokens, completionTokens),
      retryCount,
      success: true,
    };
    serverLogger.info("ai.request.completed", metrics);
    options.onMetrics?.(metrics);
    return { data, metrics };
  } catch (error) {
    const metrics: AiGenerationMetrics = {
      requestId,
      provider: "openrouter",
      model: APP_CONFIG.ai.model,
      feature: options.feature,
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      estimatedCostUsd: estimatedCostUsd(promptTokens, completionTokens),
      retryCount,
      success: false,
    };
    serverLogger.warn("ai.request.failed", {
      ...metrics,
      errorType: error instanceof Error ? error.name : "unknown",
      status: error instanceof OpenAI.APIError ? (error.status ?? null) : null,
    });
    options.onMetrics?.(metrics);
    throw error;
  }
}
