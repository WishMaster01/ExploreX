import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { NextResponse } from "next/server";
import { probeDatabase } from "@/lib/health/database-probe";
import { serverLogger } from "@/lib/observability/server-logger";
import { requestIdFrom } from "@/lib/observability/request-metrics";
import "server-only";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Checks only dependencies required to serve core requests; never probes paid providers. */
async function __route_GET(request: Request) {
  const requestId = requestIdFrom(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  const probe = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(new Error("READINESS_TIMEOUT")),
      { once: true },
    );
  });
  try {
    await Promise.race([probeDatabase(), probe]);
    return NextResponse.json(
      { status: "ready", dependencies: { database: "ok" } },
      {
        headers: {
          "Cache-Control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  } catch (error) {
    serverLogger.warn("health.readiness.failed", {
      requestId,
      dependency: "database",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { status: "not_ready", dependencies: { database: "unavailable" } },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/health/ready", { method: "GET" });
  return withRequestMetrics(request, "GET /api/health/ready", () =>
    __route_GET(...args),
  );
}
