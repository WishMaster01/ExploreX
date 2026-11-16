import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

vi.mock("@/lib/auth-user", () => ({ getOrCreateCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({ prisma: { trip: { updateMany: vi.fn() } } }));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { POST, DELETE } from "./route";

describe("owned secure trip share links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateCurrentUser).mockResolvedValue({
      id: "user-1",
    } as never);
    vi.mocked(prisma.trip.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("stores only a hash and returns a high entropy, revocable path", async () => {
    const response = await POST(
      new Request("https://explorex.example/api/trips/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId: "trip-1" }),
      }),
    );
    const body = await response.json();
    const token = body.sharePath.split("/").at(-1);
    expect(response.status).toBe(200);
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
    expect(body.sharePath).toBe(`/shared-trips/${token}`);
    expect(prisma.trip.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trip-1", userId: "user-1" },
        data: {
          shareTokenHash: createHash("sha256").update(token).digest("hex"),
        },
      }),
    );
    expect(body.shareTokenHash).toBeUndefined();
  });

  it("revokes only the current user's link", async () => {
    const response = await DELETE(
      new Request("https://explorex.example/api/trips/share", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId: "trip-1" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip-1", userId: "user-1" },
      data: { shareTokenHash: null },
    });
  });

  it("does not modify a trip for an unauthenticated user", async () => {
    vi.mocked(getOrCreateCurrentUser).mockResolvedValue(null);
    const response = await POST(
      new Request("https://explorex.example/api/trips/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId: "trip-1" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });
});
