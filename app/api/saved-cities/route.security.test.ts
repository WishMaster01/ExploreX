import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-user", () => ({
  getOrCreateCurrentUser: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    savedCity: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("saved city route ownership", () => {
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
    vi.mocked(prisma.savedCity.findMany).mockResolvedValue([]);
  });

  it("only reads saved cities for the authenticated account", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(prisma.savedCity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-a" } }),
    );
  });
});
