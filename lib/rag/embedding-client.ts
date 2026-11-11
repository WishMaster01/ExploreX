import { z } from "zod";

const embeddingResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            embedding: z.array(z.number().finite()),
          })
          .passthrough(),
      )
      .min(1),
    model: z.string().optional(),
    usage: z
      .object({ prompt_tokens: z.number().int().nonnegative().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export class EmbeddingProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = "EmbeddingProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type EmbeddingBatchResult = {
  vectors: number[][];
  model: string;
  promptTokens: number | null;
  latencyMs: number;
  estimatedCostUsd: number | null;
};

async function requestEmbeddingsOnce(
  texts: readonly string[],
  options: {
    apiKey: string;
    model: string;
    dimensions: number;
    timeoutMs?: number;
    costPerMillionUsd?: number;
    inputType?: "search_document" | "search_query";
    signal?: AbortSignal;
  },
): Promise<EmbeddingBatchResult> {
  if (texts.length === 0) {
    return {
      vectors: [],
      model: options.model,
      promptTokens: 0,
      latencyMs: 0,
      estimatedCostUsd: 0,
    };
  }
  const startedAt = performance.now();
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [...texts],
        model: options.model,
        dimensions: options.dimensions,
        input_type: options.inputType ?? "search_document",
      }),
      signal: AbortSignal.any([
        AbortSignal.timeout(options.timeoutMs ?? 20_000),
        ...(options.signal ? [options.signal] : []),
      ]),
    });
  } catch (error) {
    if (options.signal?.aborted)
      throw new EmbeddingProviderError(
        "Embedding provider request cancelled",
        "REQUEST_CANCELLED",
        false,
      );
    const timeout =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new EmbeddingProviderError(
      timeout
        ? "Embedding provider timed out"
        : "Embedding provider request failed",
      timeout ? "PROVIDER_TIMEOUT" : "PROVIDER_CONNECTION_ERROR",
      true,
    );
  }
  if (!response.ok) {
    const retryable =
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    throw new EmbeddingProviderError(
      "Embedding provider rejected the request",
      `HTTP_${response.status}`,
      retryable,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new EmbeddingProviderError(
      "Embedding provider returned invalid JSON",
      "MALFORMED_RESPONSE",
      false,
    );
  }
  const parsed = embeddingResponseSchema.safeParse(payload);
  if (!parsed.success)
    throw new EmbeddingProviderError(
      "Embedding provider returned an invalid response shape",
      "MALFORMED_RESPONSE",
      false,
    );
  if (parsed.data.data.length !== texts.length)
    throw new EmbeddingProviderError(
      "Embedding provider returned an unexpected vector count",
      "VECTOR_COUNT_MISMATCH",
      false,
    );
  const ordered = [...parsed.data.data].sort(
    (left, right) => left.index - right.index,
  );
  if (
    ordered.some(
      (entry, index) =>
        entry.index !== index || entry.embedding.length !== options.dimensions,
    )
  )
    throw new EmbeddingProviderError(
      "Embedding provider returned an unexpected vector dimension",
      "VECTOR_DIMENSION_MISMATCH",
      false,
    );
  const promptTokens = parsed.data.usage?.prompt_tokens ?? null;
  return {
    vectors: ordered.map((entry) => entry.embedding),
    model: parsed.data.model ?? options.model,
    promptTokens,
    latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    estimatedCostUsd:
      promptTokens !== null && options.costPerMillionUsd !== undefined
        ? Number(
            ((promptTokens * options.costPerMillionUsd) / 1_000_000).toFixed(8),
          )
        : null,
  };
}

/** At most one retry, and only for classified timeout, quota, connection, or 5xx failures. */
export async function requestEmbeddings(
  texts: readonly string[],
  options: Parameters<typeof requestEmbeddingsOnce>[1],
): Promise<EmbeddingBatchResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestEmbeddingsOnce(texts, options);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (
        !(error instanceof EmbeddingProviderError) ||
        !error.retryable ||
        attempt >= 1
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}
