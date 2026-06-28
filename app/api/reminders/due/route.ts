import { apiError, apiOk, serverError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const reminders = await prisma.reminder.findMany({
      where: { status: "scheduled", remindAt: { lte: new Date() } },
      orderBy: [{ remindAt: "asc" }, { id: "asc" }],
      take: 100,
      select: { id: true, type: true, message: true, remindAt: true, userId: true, tripId: true },
    });
    return apiOk({ reminders });
  } catch (error) {
    return serverError(error, "Error fetching due reminders");
  }
}

