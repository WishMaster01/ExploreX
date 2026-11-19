import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { apiOk } from "@/lib/api";
import { exploreCities } from "@/lib/data/cities";
import { prisma } from "@/lib/db";
import "server-only";

async function __route_GET() {
  if (process.env.NODE_ENV === "production") {
    return apiOk({ cities: [], source: "no_reviewed_guides" });
  }
  try {
    const records = await prisma.cityGuide.findMany({
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: { content: true },
    });
    if (records.length) {
      return apiOk({
        cities: records.map(
          (record) => record.content as (typeof exploreCities)[number],
        ),
        source: "development_database",
      });
    }
  } catch {
    // Public catalog remains available from its curated seed while DB is offline.
  }
  return apiOk({ cities: exploreCities, source: "demo_seed" });
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/city-guides", { method: "GET" });
  return withRequestMetrics(request, "GET /api/city-guides", () =>
    __route_GET(...args),
  );
}
