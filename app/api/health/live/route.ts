import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { NextResponse } from "next/server";

/** Process liveness only. The platform should restart the process on failure. */
function __route_GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/health/live", { method: "GET" });
  return withRequestMetrics(request, "GET /api/health/live", () =>
    __route_GET(...args),
  );
}
