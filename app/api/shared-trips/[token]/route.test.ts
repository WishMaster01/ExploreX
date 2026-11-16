import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { testPlan } from "@/lib/agent-planner/test-fixtures";

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => ({ prisma: { trip: { findFirst: vi.fn() } } }));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("public shared itinerary projection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the intentionally shareable itinerary fields and prevents caching", async () => {
    const token = "a".repeat(43);
    vi.mocked(prisma.trip.findFirst).mockResolvedValue({
      destination: "Jaipur",
      duration: "1 day",
      plan: testPlan,
    } as never);
    const response = await GET(
      new Request(`https://example.test/api/shared-trips/${token}`),
      { params: Promise.resolve({ token }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.destination).toBe("Jaipur");
    expect(body.days[0].activities[0].name).toBe("Test Heritage Site");
    expect(body.origin).toBeUndefined();
    expect(body.budget).toBeUndefined();
    expect(body.hotels).toBeUndefined();
    expect(prisma.trip.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shareTokenHash: createHash("sha256").update(token).digest("hex"),
        },
        select: { destination: true, duration: true, plan: true },
      }),
    );
  });

  it("rejects malformed capability tokens without database access", async () => {
    const token = "bad-token";
    const response = await GET(
      new Request(`https://example.test/api/shared-trips/${token}`),
      { params: Promise.resolve({ token }) },
    );
    expect(response.status).toBe(404);
    expect(prisma.trip.findFirst).not.toHaveBeenCalled();
  });
});
