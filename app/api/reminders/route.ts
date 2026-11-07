import { apiError, apiOk, readJson, serverError } from "@/lib/api";
import { ReminderStatus, ReminderType } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
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
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (idempotencyKey && (idempotencyKey.length < 1 || idempotencyKey.length > 128))
      return apiError("Idempotency-Key must be at most 128 characters", 400, "VALIDATION_ERROR");
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
    const data = {
      tripId,
      userId: user.id,
      type: reminderTypes[type],
      message,
      remindAt,
      timeZone,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };
    const select = {
      id: true,
      type: true,
      message: true,
      remindAt: true,
      status: true,
      tripId: true,
      timeZone: true,
    } as const;
    try {
      const reminder = await prisma.reminder.create({ data, select });
      return apiOk(reminderDto(reminder), 201);
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.reminder.findUnique({
          where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
          select,
        });
        if (existing) {
          const sameRequest =
            existing.tripId === tripId &&
            existing.type === reminderTypes[type] &&
            existing.message === message &&
            existing.remindAt.getTime() === remindAt.getTime() &&
            existing.timeZone === timeZone;
          if (!sameRequest)
            return apiError("Idempotency-Key was already used for another request", 409, "CONFLICT");
          return apiOk(reminderDto(existing));
        }
      }
      throw error;
    }
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
