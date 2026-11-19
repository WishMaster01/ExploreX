import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { apiError, apiOk, serverError } from "@/lib/api";
import { ReminderStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import "server-only";
import { getServerEnvironment } from "@/lib/env";

async function __route_GET(request: Request) {
  try {
    const secret = getServerEnvironment().CRON_SECRET;
    if (!secret) {
      return apiError(
        "Reminder processing is not configured",
        503,
        "SERVICE_UNAVAILABLE",
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const reminders = await prisma.reminder.findMany({
      where: {
        status: ReminderStatus.SCHEDULED,
        remindAt: { lte: new Date() },
      },
      orderBy: [{ remindAt: "asc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        message: true,
        remindAt: true,
        userId: true,
        tripId: true,
      },
    });
    return apiOk({ reminders });
  } catch (error) {
    return serverError(error, "Error fetching due reminders");
  }
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/reminders/due", { method: "GET" });
  return withRequestMetrics(request, "GET /api/reminders/due", () =>
    __route_GET(...args),
  );
}
