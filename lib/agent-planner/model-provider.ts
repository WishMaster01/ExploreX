import "server-only";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ZodType } from "zod";
import { getServerEnvironment } from "@/lib/env";

export type AgentModelMetrics = {
  provider: "openrouter" | "gemini";
  model: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  retries: number;
};

export interface AgentModelProvider {
  readonly provider: "openrouter" | "gemini";
  readonly model: string;
  generateStructured<T>(input: {
    task: string;
    prompt: string;
    schema: ZodType<T>;
    signal: AbortSignal;
  }): Promise<{ value: T; metrics: AgentModelMetrics }>;
}

function usageNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function isTransient(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return false;
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500 ||
    (error instanceof Error && /fetch|network|socket|timeout/i.test(error.name))
  );
}

async function invokeWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  parentSignal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromParent = () => controller.abort();
  parentSignal.addEventListener("abort", abortFromParent, { once: true });
  try {
    return await operation(AbortSignal.any([controller.signal, parentSignal]));
  } finally {
    clearTimeout(timeout);
    parentSignal.removeEventListener("abort", abortFromParent);
  }
}

function createConfiguredModel(): {
  provider: "openrouter" | "gemini";
  modelName: string;
  model: BaseChatModel;
} {
  const env = getServerEnvironment();
  if (env.AI_AGENT_PROVIDER === "gemini") {
    if (!env.GEMINI_API_KEY) throw new Error("AGENT_PROVIDER_NOT_CONFIGURED");
    const modelName = env.AI_AGENT_MODEL ?? "gemini-2.5-flash";
    return {
      provider: "gemini",
      modelName,
      model: new ChatGoogleGenerativeAI({
        apiKey: env.GEMINI_API_KEY,
        model: modelName,
        temperature: 0,
        maxOutputTokens: env.AI_AGENT_MAX_TOKENS,
        maxRetries: 0,
      }),
    };
  }
  if (!env.OPENROUTER_API_KEY) throw new Error("AGENT_PROVIDER_NOT_CONFIGURED");
  const modelName = env.AI_AGENT_MODEL ?? "openai/gpt-4.1-mini";
  return {
    provider: "openrouter",
    modelName,
    model: new ChatOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      model: modelName,
      temperature: 0,
      maxTokens: env.AI_AGENT_MAX_TOKENS,
      timeout: env.AI_AGENT_TIMEOUT_MS,
      maxRetries: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
    }),
  };
}

export function createAgentModelProvider(
  configured = createConfiguredModel(),
): AgentModelProvider {
  const env = getServerEnvironment();
  return {
    provider: configured.provider,
    model: configured.modelName,
    async generateStructured<T>(input: {
      task: string;
      prompt: string;
      schema: ZodType<T>;
      signal: AbortSignal;
    }) {
      const { task, prompt, schema, signal } = input;
      const structured = configured.model.withStructuredOutput(schema, {
        name: task,
        strict: true,
        includeRaw: true,
      });
      const startedAt = performance.now();
      let retries = 0;
      for (;;) {
        try {
          const result = await invokeWithTimeout(
            (requestSignal) =>
              structured.invoke(prompt, { signal: requestSignal }),
            signal,
            env.AI_AGENT_TIMEOUT_MS,
          );
          const value = schema.parse(result.parsed);
          const usage = (result.raw as { usage_metadata?: unknown } | undefined)
            ?.usage_metadata as
            | { input_tokens?: unknown; output_tokens?: unknown }
            | undefined;
          const inputTokens = usageNumber(usage?.input_tokens);
          const outputTokens = usageNumber(usage?.output_tokens);
          const inputRate = env.AI_AGENT_INPUT_COST_PER_MILLION;
          const outputRate = env.AI_AGENT_OUTPUT_COST_PER_MILLION;
          const estimatedCostUsd =
            inputTokens !== null &&
            outputTokens !== null &&
            inputRate !== undefined &&
            outputRate !== undefined
              ? Number(
                  (
                    (inputTokens * inputRate + outputTokens * outputRate) /
                    1_000_000
                  ).toFixed(8),
                )
              : null;
          return {
            value,
            metrics: {
              provider: configured.provider,
              model: configured.modelName,
              latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
              inputTokens,
              outputTokens,
              estimatedCostUsd,
              retries,
            },
          };
        } catch (error) {
          if (signal.aborted) throw new Error("AGENT_CANCELLED");
          if (error instanceof Error && error.name === "AbortError")
            throw error;
          if (retries >= env.AI_AGENT_MAX_RETRIES || !isTransient(error))
            throw error;
          retries += 1;
          await new Promise((resolve) => setTimeout(resolve, 200 * retries));
        }
      }
    },
  };
}
