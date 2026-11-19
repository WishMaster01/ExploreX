import { randomUUID } from "node:crypto";
import { serverLogger } from "./server-logger";
import { runWithRequestContext } from "./request-context";
import "server-only";

type RouteHandler = () => Response | Promise<Response>;

type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
};

function traceContextFrom(request: Request): TraceContext {
  const parent = request.headers.get("traceparent");
  const match = parent?.match(
    /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i,
  );
  const parentValid = Boolean(
    match && !/^0+$/.test(match[1]) && !/^0+$/.test(match[2]),
  );
  return {
    traceId: parentValid
      ? match![1].toLowerCase()
      : randomUUID().replaceAll("-", ""),
    spanId: randomUUID().replaceAll("-", "").slice(0, 16),
    ...(parentValid ? { parentSpanId: match![2].toLowerCase() } : {}),
    sampled: parentValid
      ? (parseInt(match![3], 16) & 1) === 1
      : Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
  };
}

function otlpAttribute(key: string, value: string | number) {
  return {
    key,
    value:
      typeof value === "number"
        ? { intValue: String(value) }
        : { stringValue: value },
  };
}

async function exportHttpSpan(input: {
  trace: TraceContext;
  requestId: string;
  method: string;
  route: string;
  status: number;
  startedAtNs: bigint;
  finishedAtNs: bigint;
}) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/+$/, "");
  if (!endpoint || !input.trace.sampled) return;
  const url = endpoint.endsWith("/v1/traces")
    ? endpoint
    : `${endpoint}/v1/traces`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.OTEL_EXPORTER_OTLP_TOKEN
          ? { authorization: `Bearer ${process.env.OTEL_EXPORTER_OTLP_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        resourceSpans: [
          {
            resource: {
              attributes: [otlpAttribute("service.name", "explorex-india")],
            },
            scopeSpans: [
              {
                scope: { name: "explorex.http" },
                spans: [
                  {
                    traceId: input.trace.traceId,
                    spanId: input.trace.spanId,
                    ...(input.trace.parentSpanId
                      ? { parentSpanId: input.trace.parentSpanId }
                      : {}),
                    name: `${input.method} ${input.route}`,
                    kind: 2,
                    startTimeUnixNano: input.startedAtNs.toString(),
                    endTimeUnixNano: input.finishedAtNs.toString(),
                    attributes: [
                      otlpAttribute("http.request.method", input.method),
                      otlpAttribute("http.route", input.route),
                      otlpAttribute("http.response.status_code", input.status),
                      otlpAttribute("request.id", input.requestId),
                    ],
                    status: { code: input.status >= 500 ? 2 : 1 },
                  },
                ],
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok)
      serverLogger.warn("telemetry.otlp.export_failed", {
        requestId: input.requestId,
        status: response.status,
      });
  } catch (error) {
    serverLogger.warn("telemetry.otlp.export_failed", {
      requestId: input.requestId,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "connection",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function requestIdFrom(request: Request) {
  const supplied = request.headers.get("x-request-id");
  return supplied &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      supplied,
    )
    ? supplied
    : randomUUID();
}

async function responseErrorCode(response: Response) {
  if (response.status < 400) return undefined;
  try {
    const body: unknown = await response.clone().json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = body.error;
      if (typeof error === "object" && error !== null && "code" in error) {
        return typeof error.code === "string" ? error.code : undefined;
      }
    }
  } catch {
    // Do not read or log response bodies that are not structured API errors.
  }
  return undefined;
}

export async function withRequestMetrics(
  request: Request,
  route: string,
  handler: RouteHandler,
) {
  const requestId = requestIdFrom(request);
  const trace = traceContextFrom(request);
  const startedAt = performance.now();
  const startedAtNs = BigInt(Date.now()) * 1_000_000n;
  try {
    const response = await runWithRequestContext(
      { requestId, traceId: trace.traceId },
      handler,
    );
    const latencyMs = Math.round(performance.now() - startedAt);
    const finishedAtNs = BigInt(Date.now()) * 1_000_000n;
    const errorCode = await responseErrorCode(response);
    const context = {
      requestId,
      traceId: trace.traceId,
      route,
      latencyMs,
      status: response.status,
      errorCode,
    };
    if (response.status >= 500)
      serverLogger.warn("http.request.completed", context);
    else serverLogger.info("http.request.completed", context);

    void exportHttpSpan({
      trace,
      requestId,
      method: request.method,
      route,
      status: response.status,
      startedAtNs,
      finishedAtNs,
    });

    const headers = new Headers(response.headers);
    headers.set("x-request-id", requestId);
    headers.set(
      "traceparent",
      `00-${trace.traceId}-${trace.spanId}-${trace.sampled ? "01" : "00"}`,
    );
    headers.set("server-timing", `app;dur=${latencyMs}`);
    headers.set("cache-control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    void exportHttpSpan({
      trace,
      requestId,
      method: request.method,
      route,
      status: 500,
      startedAtNs,
      finishedAtNs: BigInt(Date.now()) * 1_000_000n,
    });
    serverLogger.error("http.request.failed", {
      requestId,
      traceId: trace.traceId,
      route,
      latencyMs: Math.round(performance.now() - startedAt),
      status: 500,
      errorCode: "SERVER_ERROR",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}
