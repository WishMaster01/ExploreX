import {
  tripsDelete,
  tripsGet,
  tripsPatch,
  tripsPost,
} from "@/lib/trips-route-handlers";
import "server-only";
import { withRequestMetrics } from "@/lib/observability/request-metrics";

export async function POST(request: Request) {
  return withRequestMetrics(request, "POST /api/trips", () =>
    tripsPost(request),
  );
}

export async function GET(request: Request) {
  return withRequestMetrics(request, "GET /api/trips", () => tripsGet(request));
}

export async function PATCH(request: Request) {
  return withRequestMetrics(request, "PATCH /api/trips", () =>
    tripsPatch(request),
  );
}

export async function DELETE(request: Request) {
  return withRequestMetrics(request, "DELETE /api/trips", () =>
    tripsDelete(request),
  );
}
