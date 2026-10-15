import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-user", () => ({
  getOrCreateCurrentUser: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    reminder: { updateMany: vi.fn(), findMany: vi.fn() },
    trip: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

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
});
