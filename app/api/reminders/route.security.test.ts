import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-user", () => ({
  getOrCreateCurrentUser: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    reminder: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    trip: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { Role } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { PATCH, POST } from "./route";

describe("reminder route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateCurrentUser).mockResolvedValue({
      id: "user-a",
      clerkUserId: "clerk-a",
      email: "a@example.com",
      name: "User A",
      imageUrl: null,
      subscription: "free",
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getOrCreateCurrentUser>>);
    vi.mocked(prisma.reminder.updateMany).mockResolvedValue({ count: 0 });
  });

  it("cannot complete another user's reminder", async () => {
    const response = await PATCH(
      new Request("https://explorex.test/api/reminders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "reminder-b", status: "completed" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(prisma.reminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "reminder-b", userId: "user-a" },
      }),
    );
  });

  it("cannot create a reminder for another user's trip", async () => {
    vi.mocked(prisma.trip.findFirst).mockResolvedValue(null);
    const response = await POST(
      new Request("https://explorex.test/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tripId: "trip-b",
          type: "trip",
          message: "Reminder",
          remindAt: new Date(Date.now() + 60_000).toISOString(),
          timeZone: "Asia/Kolkata",
        }),
      }),
    );
    expect(response.status).toBe(404);
    expect(prisma.trip.findFirst).toHaveBeenCalledWith({
      where: { id: "trip-b", userId: "user-a" },
      select: { id: true },
    });
    expect(prisma.reminder.create).not.toHaveBeenCalled();
  });

  it("returns the prior reminder when a create is retried with the same key", async () => {
    const remindAt = new Date(Date.now() + 60_000);
    vi.mocked(prisma.trip.findFirst).mockResolvedValue({ id: "trip-a" } as never);
    vi.mocked(prisma.reminder.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate key", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );
    vi.mocked(prisma.reminder.findUnique).mockResolvedValue({
      id: "reminder-a",
      type: "TRIP",
      message: "Reminder",
      remindAt,
      status: "SCHEDULED",
      tripId: "trip-a",
      timeZone: "Asia/Kolkata",
    } as never);
    const response = await POST(
      new Request("https://explorex.test/api/reminders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "retry-1",
        },
        body: JSON.stringify({
          tripId: "trip-a",
          type: "trip",
          message: "Reminder",
          remindAt: remindAt.toISOString(),
          timeZone: "Asia/Kolkata",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(prisma.reminder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_idempotencyKey: { userId: "user-a", idempotencyKey: "retry-1" },
        },
      }),
    );
  });
});
