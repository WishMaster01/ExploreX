import { apiError, apiOk, readJson, serverError } from "@/lib/api";
import { ReminderStatus, ReminderType } from "@/lib/generated/prisma/client";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { ownedReminderWhere, ownedTripWhere } from "@/lib/domain/ownership";
import {
  reminderCreateSchema,
  reminderUpdateSchema,
} from "@/lib/domain/schemas";
import "server-only";

const reminderTypes = {
  trip: ReminderType.TRIP,
  packing: ReminderType.PACKING,
  booking: ReminderType.BOOKING,
} as const;

function reminderDto<T extends { type: ReminderType; status?: ReminderStatus }>(
  reminder: T,
) {
  return {
    ...reminder,
    type: reminder.type.toLowerCase(),
    ...(reminder.status ? { status: reminder.status.toLowerCase() } : {}),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const policy = APP_CONFIG.rateLimits.reminderRead;
    const denied = await enforceRateLimit(request, {
      capacity: policy.capacity,
      interval: policy.interval,
      refillRate: policy.refillRate,
      userId: user.id,
    });
    if (denied) return denied;
    const reminders = await prisma.reminder.findMany({
      where: { userId: user.id, status: ReminderStatus.SCHEDULED },
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
    return apiOk(reminders.map(reminderDto));
  } catch (error) {
    return serverError(error, "Error fetching reminders");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const policy = APP_CONFIG.rateLimits.reminderWrite;
    const denied = await enforceRateLimit(request, {
      capacity: policy.capacity,
      interval: policy.interval,
      refillRate: policy.refillRate,
      userId: user.id,
    });
    if (denied) return denied;
    const parsed = reminderCreateSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return apiError(
        "A valid trip, reminder type, message, and date are required",
        400,
        "VALIDATION_ERROR",
      );
    const { tripId, type, message, timeZone } = parsed.data;
    const remindAt = new Date(parsed.data.remindAt);
    const now = Date.now();
    if (
      remindAt.getTime() <= now ||
      remindAt.getTime() > now + APP_CONFIG.reminders.maxScheduleAheadMs
    ) {
      return apiError(
        "remindAt must be in the future and within two years",
        400,
        "BAD_REQUEST",
      );
    }
    const trip = await prisma.trip.findFirst({
      where: ownedTripWhere(user.id, tripId),
      select: { id: true },
    });
    if (!trip) return apiError("Trip not found", 404, "NOT_FOUND");
    const reminder = await prisma.reminder.create({
      data: {
        tripId,
        userId: user.id,
        type: reminderTypes[type],
        message,
        remindAt,
        timeZone,
      },
      select: {
        id: true,
        type: true,
        message: true,
        remindAt: true,
        status: true,
        tripId: true,
      },
    });
    return apiOk(reminderDto(reminder), 201);
  } catch (error) {
    return serverError(error, "Error creating reminder");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const policy = APP_CONFIG.rateLimits.reminderWrite;
    const denied = await enforceRateLimit(request, {
      capacity: policy.capacity,
      interval: policy.interval,
      refillRate: policy.refillRate,
      userId: user.id,
    });
    if (denied) return denied;
    const parsed = reminderUpdateSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return apiError(
        "A valid reminder id and status are required",
        400,
        "VALIDATION_ERROR",
      );
    const { id, status } = parsed.data;
    const updated = await prisma.reminder.updateMany({
      where: ownedReminderWhere(user.id, id),
      data: {
        status:
          status === "cancelled"
            ? ReminderStatus.CANCELLED
            : ReminderStatus.COMPLETED,
      },
    });
    if (!updated.count) return apiError("Reminder not found", 404, "NOT_FOUND");
    return apiOk({ updated: true });
  } catch (error) {
    return serverError(error, "Error updating reminder");
  }
}
