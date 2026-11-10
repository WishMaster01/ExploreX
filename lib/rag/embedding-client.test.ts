import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddingProviderError, requestEmbeddings } from "./embedding-client";

afterEach(() => vi.unstubAllGlobals());

describe("embedding provider boundary", () => {
  it("orders vectors by provider index and returns bounded usage metrics", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "test/model",
          data: [
            { index: 1, embedding: [0, 1] },
            { index: 0, embedding: [1, 0] },
          ],
          usage: { prompt_tokens: 100 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestEmbeddings(["a", "b"], {
      apiKey: "test-key",
      model: "test/model",
      dimensions: 2,
      costPerMillionUsd: 0.02,
    });
    expect(result.vectors).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(result.estimatedCostUsd).toBe(0.000002);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer test-key" },
    });
  });

  it("classifies timeouts, retryable quotas, malformed payloads, and dimensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
    );
    await expect(
      requestEmbeddings(["a"], { apiKey: "k", model: "m", dimensions: 2 }),
    ).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT", retryable: true });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );
    await expect(
      requestEmbeddings(["a"], { apiKey: "k", model: "m", dimensions: 2 }),
    ).rejects.toMatchObject({ code: "HTTP_429", retryable: true });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    await expect(
      requestEmbeddings(["a"], { apiKey: "k", model: "m", dimensions: 2 }),
    ).rejects.toMatchObject({ code: "MALFORMED_RESPONSE", retryable: false });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ index: 0, embedding: [1] }],
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      requestEmbeddings(["a"], { apiKey: "k", model: "m", dimensions: 2 }),
    ).rejects.toBeInstanceOf(EmbeddingProviderError);
  });
});
