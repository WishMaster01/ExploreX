import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { NextResponse } from "next/server";
import "server-only";

/**
 * No user trip stories are currently published. Destination profiles are not
 * traveler stories, and private trip records require explicit consent.
 */
async function __route_GET() {
  return NextResponse.json({
    success: true,
    source: "no_published_stories",
    stories: [],
  });
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/stories", { method: "GET" });
  return withRequestMetrics(request, "GET /api/stories", () =>
    __route_GET(...args),
  );
}
