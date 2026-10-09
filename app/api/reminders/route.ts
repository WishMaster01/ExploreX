import { apiError, apiOk, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  reminderCreateSchema,
  reminderUpdateSchema,
} from "@/lib/domain/schemas";
import "server-only";

export async function GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      capacity: 120,
      interval: 3600,
      refillRate: 60,
      userId: user.id,
    });
    if (denied) return denied;
    const reminders = await prisma.reminder.findMany({
      where: { userId: user.id, status: "scheduled" },
      orderBy: [{ remindAt: "asc" }, { id: "asc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        message: true,
        remindAt: true,
        status: true,
        tripId: true,
      },
    });
    return apiOk(reminders);
  } catch (error) {
    return serverError(error, "Error fetching reminders");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      capacity: 30,
      interval: 3600,
      refillRate: 15,
      userId: user.id,
    });
    if (denied) return denied;
    const parsed = reminderCreateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError(
        "A valid trip, reminder type, message, and date are required",
        400,
        "VALIDATION_ERROR",
      );
    const { tripId, type, message } = parsed.data;
    const remindAt = new Date(parsed.data.remindAt);
    const now = Date.now();
    if (
      remindAt.getTime() <= now ||
      remindAt.getTime() > now + 2 * 365 * 24 * 60 * 60_000
    ) {
      return apiError(
        "remindAt must be in the future and within two years",
        400,
        "BAD_REQUEST",
      );
    }
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
      select: { id: true },
    });
    if (!trip) return apiError("Trip not found", 404, "NOT_FOUND");
    const reminder = await prisma.reminder.create({
      data: { tripId, userId: user.id, type, message, remindAt },
      select: {
        id: true,
        type: true,
        message: true,
        remindAt: true,
        status: true,
        tripId: true,
      },
    });
    return apiOk(reminder, 201);
  } catch (error) {
    return serverError(error, "Error creating reminder");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const parsed = reminderUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return apiError(
        "A valid reminder id and status are required",
        400,
        "VALIDATION_ERROR",
      );
    const { id, status } = parsed.data;
    const updated = await prisma.reminder.updateMany({
      where: { id, userId: user.id },
      data: { status },
    });
    if (!updated.count) return apiError("Reminder not found", 404, "NOT_FOUND");
    return apiOk({ updated: true });
  } catch (error) {
    return serverError(error, "Error updating reminder");
  }
}
