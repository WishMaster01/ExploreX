import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { createHash } from "node:crypto";
import { apiError, apiOk, serverError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { tripInfoSchema } from "@/lib/ai-schemas";
import "server-only";

async function __route_GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token))
      return apiError("Shared itinerary not found", 404, "NOT_FOUND");
    const denied = await enforceRateLimit(request, {
      capacity: 30,
      interval: 3600,
      refillRate: 15,
      userId: "public-trip-share",
      keyByIp: true,
    });
    if (denied) return denied;
    const shareTokenHash = createHash("sha256").update(token).digest("hex");
    const trip = await prisma.trip.findFirst({
      where: { shareTokenHash },
      select: { destination: true, duration: true, plan: true },
    });
    const plan = tripInfoSchema.safeParse(trip?.plan);
    if (!trip || !plan.success)
      return apiError("Shared itinerary not found", 404, "NOT_FOUND");
    const response = apiOk({
      destination: trip.destination,
      duration: trip.duration,
      days: plan.data.itinerary.map((day) => ({
        day: day.day,
        title: day.day_plan,
        activities: day.activities.map((activity) => ({
          name: activity.place_name,
          details: activity.place_details,
          start: activity.scheduled_start ?? null,
          end: activity.scheduled_end ?? null,
          durationMinutes: activity.visit_duration_minutes ?? null,
        })),
      })),
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return serverError(error, "Unable to load shared itinerary");
  }
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/shared-trips/[token]", {
          method: "GET",
        });
  return withRequestMetrics(request, "GET /api/shared-trips/[token]", () =>
    __route_GET(...args),
  );
}
