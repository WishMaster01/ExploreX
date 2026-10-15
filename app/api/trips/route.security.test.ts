import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-user", () => ({
  getOrCreateCurrentUser: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    trip: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DELETE, GET } from "./route";

const findFirst = vi.mocked(prisma.trip.findFirst);
const deleteMany = vi.mocked(prisma.trip.deleteMany);
const currentUser = vi.mocked(getOrCreateCurrentUser);

describe("trip route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.mockResolvedValue({
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
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns not found for a trip owned by another user and scopes the read", async () => {
    findFirst.mockResolvedValue(null);
    const response = await GET(
      new Request("https://explorex.test/api/trips?id=trip-b"),
    );
    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trip-b", userId: "user-a" },
      }),
    );
  });

  it("does not delete a trip owned by another user", async () => {
    const response = await DELETE(
      new Request("https://explorex.test/api/trips?id=trip-b", {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(404);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "trip-b", userId: "user-a" },
    });
  });

  it("rejects unauthenticated requests before querying trip data", async () => {
    currentUser.mockResolvedValue(null);
    const response = await GET(new Request("https://explorex.test/api/trips"));
    expect(response.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
