import { afterEach, describe, expect, it, vi } from "vitest";
import { requestIdFrom, withRequestMetrics } from "./request-metrics";

vi.mock("./server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("request correlation", () => {
  it("accepts UUID request IDs and replaces malformed or oversized values", () => {
    expect(
      requestIdFrom(
        new Request("https://explorex.test", {
          headers: { "x-request-id": "f313e576-c7d5-4a1b-8d92-52cabfc523fb" },
        }),
      ),
    ).toBe("f313e576-c7d5-4a1b-8d92-52cabfc523fb");
    expect(
      requestIdFrom(
        new Request("https://explorex.test", {
          headers: { "x-request-id": "untrusted-forged-id" },
        }),
      ),
    ).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("adds correlation and timing headers to responses", async () => {
    const response = await withRequestMetrics(
      new Request("https://explorex.test", {
        headers: { "x-request-id": "f313e576-c7d5-4a1b-8d92-52cabfc523fb" },
      }),
      "GET /test",
      async () => Response.json({ ok: true }),
    );
    expect(response.headers.get("x-request-id")).toBe(
      "f313e576-c7d5-4a1b-8d92-52cabfc523fb",
    );
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=/);
  });

  it("exports a W3C trace as OTLP JSON and preserves its parent context", async () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://collector.example/otlp");
    vi.stubEnv("OTEL_EXPORTER_OTLP_TOKEN", "test-token");
    const exporter = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", exporter);
    const response = await withRequestMetrics(
      new Request("https://explorex.test/api/places", {
        headers: {
          "x-request-id": "f313e576-c7d5-4a1b-8d92-52cabfc523fb",
          traceparent:
            "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        },
      }),
      "GET /api/places",
      async () => Response.json({ ok: true }),
    );
    const [url, init] = exporter.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    const span = payload.resourceSpans[0].scopeSpans[0].spans[0];
    expect(url).toBe("https://collector.example/otlp/v1/traces");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer test-token",
    );
    expect(span.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(span.parentSpanId).toBe("00f067aa0ba902b7");
    expect(span.attributes).toContainEqual({
      key: "http.route",
      value: { stringValue: "GET /api/places" },
    });
    expect(response.headers.get("traceparent")).toMatch(
      /^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/,
    );
  });
});
