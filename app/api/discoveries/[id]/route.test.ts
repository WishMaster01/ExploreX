import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { communityDiscovery: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/db";
import { DiscoveryModerationStatus } from "@/lib/generated/prisma/client";
import { GET } from "./route";

describe("public discovery detail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns approved fields and withholds sensitive coordinates", async () => {
    vi.mocked(prisma.communityDiscovery.findFirst).mockResolvedValue({
      id: "d-1",
      title: "A community submitted place",
      description: "A detailed description of this experience.",
      destinationId: "jaipur-in",
      category: "heritage",
      latitude: 26.9,
      longitude: 75.8,
      locationLabel: "Private location",
      sensitiveLocation: true,
      estimatedCostMinor: null,
      currencyCode: null,
      durationMinutes: 45,
      sourceUrl: null,
      accessRestrictions: null,
      sourceCorroborated: false,
      commercialRelationship: null,
      moderatedAt: new Date(),
      signals: [],
      _count: { savedBy: 0 },
    } as never);
    const response = await GET(
      new Request("https://example.test/api/discoveries/d-1"),
      { params: Promise.resolve({ id: "d-1" }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(prisma.communityDiscovery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "d-1",
          moderationStatus: DiscoveryModerationStatus.APPROVED,
        },
      }),
    );
    expect(body.sensitiveLocation).toBe(true);
    expect(body.latitude).toBeNull();
    expect(body.longitude).toBeNull();
    expect(body.locationLabel).toBeNull();
    expect(body.trustSignals.visitEvidenceSupplied).toBe(false);
  });

  it("rejects malformed IDs before querying", async () => {
    const response = await GET(
      new Request("https://example.test/api/discoveries/.."),
      { params: Promise.resolve({ id: ".." }) },
    );
    expect(response.status).toBe(404);
    expect(prisma.communityDiscovery.findFirst).not.toHaveBeenCalled();
  });
});
