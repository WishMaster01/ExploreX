import { randomUUID } from "node:crypto";
import { serverLogger } from "./server-logger";
import "server-only";

type RouteHandler = () => Promise<Response>;

function requestIdFrom(request: Request) {
  const supplied = request.headers.get("x-request-id");
  return supplied && /^[A-Za-z0-9._-]{1,80}$/.test(supplied)
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
  const startedAt = performance.now();
  try {
    const response = await handler();
    const latencyMs = Math.round(performance.now() - startedAt);
    const errorCode = await responseErrorCode(response);
    const context = {
      requestId,
      route,
      latencyMs,
      status: response.status,
      errorCode,
    };
    if (response.status >= 500)
      serverLogger.warn("http.request.completed", context);
    else serverLogger.info("http.request.completed", context);

    const headers = new Headers(response.headers);
    headers.set("x-request-id", requestId);
    headers.set("server-timing", `app;dur=${latencyMs}`);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    serverLogger.error("http.request.failed", {
      requestId,
      route,
      latencyMs: Math.round(performance.now() - startedAt),
      status: 500,
      errorCode: "SERVER_ERROR",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}
