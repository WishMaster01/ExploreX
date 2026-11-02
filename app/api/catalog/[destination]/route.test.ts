import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<() => Promise<unknown[]>>(async () => []),
  findUnique: vi.fn<() => Promise<unknown>>(async () => null),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    siteDataset: { findMany: mocks.findMany, findUnique: mocks.findUnique },
  },
}));

import { GET } from "./route";

describe("GET /api/catalog/[destination]", () => {
  beforeEach(() => {
    mocks.findMany.mockResolvedValue([]);
    mocks.findUnique.mockResolvedValue(null);
  });

  it("serves normalized destination data for the canonical ID and city alias", async () => {
    const response = await GET(
      new Request("http://localhost/api/catalog/bali-indonesia"),
      {
        params: Promise.resolve({ destination: "Bali" }),
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.catalog.destination).toMatchObject({
      id: "bali-indonesia",
      destinationType: "island",
    });
    expect(body.catalog.places).toEqual([]);
    expect(body.manifest.destinationId).toBe("bali-indonesia");
    expect(body.source).toBe("checked_in");
  });

  it("retains a legacy Jaipur response alongside normalized records", async () => {
    const response = await GET(
      new Request("http://localhost/api/catalog/jaipur"),
      {
        params: Promise.resolve({ destination: "jaipur" }),
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.catalog.destination.id).toBe("jaipur-in");
    expect(body.catalog.places).toHaveLength(4);
    expect(body.legacy.catalog.places).toHaveLength(4);
  });

  it("rejects unknown destination paths", async () => {
    const response = await GET(
      new Request("http://localhost/api/catalog/not-a-destination"),
      {
        params: Promise.resolve({ destination: "not-a-destination" }),
      },
    );
    expect(response.status).toBe(404);
  });
});
