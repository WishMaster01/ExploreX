import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { apiError, apiOk } from "@/lib/api";
import { DESTINATIONS } from "@/lib/data/destinations";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import "server-only";

async function __route_GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== "destinations") {
    return apiError("Dataset is not available", 404, "NOT_FOUND");
  }
  const destinations = await loadSiteDataset("destinations", DESTINATIONS);
  return apiOk({ key, content: destinations });
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/site-datasets", { method: "GET" });
  return withRequestMetrics(request, "GET /api/site-datasets", () =>
    __route_GET(...args),
  );
}
