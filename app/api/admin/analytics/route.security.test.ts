import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-user", () => ({
  getOrCreateCurrentUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: { groupBy: vi.fn() },
    trip: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("admin analytics authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_USERS", "");
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
  });

  it("returns forbidden before querying analytics for a non-admin", async () => {
    const response = await GET(
      new Request("https://explorex.test/api/admin/analytics"),
    );
    expect(response.status).toBe(403);
    expect(prisma.analyticsEvent.groupBy).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
