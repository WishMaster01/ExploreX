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
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

async function readDataset(relativePath: string) {
  return JSON.parse(
    await readFile(path.join(process.cwd(), relativePath), "utf8"),
  ) as unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return z.record(z.string(), z.unknown()).parse(value);
}

async function persistedJaipurRows() {
  const destinationId = "jaipur-in";
  const values = {
    destination: await readDataset(
      `data/destinations/${destinationId}/destination.json`,
    ),
    places: await readDataset(`data/destinations/${destinationId}/places.json`),
    restaurants: await readDataset(
      `data/destinations/${destinationId}/restaurants.json`,
    ),
    hotels: await readDataset(`data/destinations/${destinationId}/hotels.json`),
    experiences: await readDataset(
      `data/destinations/${destinationId}/experiences.json`,
    ),
    events: await readDataset(`data/destinations/${destinationId}/events.json`),
    routes: await readDataset(`data/destinations/${destinationId}/routes.json`),
    travelGuide: await readDataset(
      `data/destinations/${destinationId}/travel-guide.json`,
    ),
    manifest: await readDataset(
      `data/destinations/${destinationId}/manifest.json`,
    ),
    taxonomy: await readDataset("data/catalogs/travel-taxonomy.json"),
    sources: await readDataset("data/catalogs/source-registry.json"),
  };
  return Object.entries(values).map(([name, content]) => ({
    key:
      name === "taxonomy"
        ? "travel:taxonomy"
        : name === "sources"
          ? "travel:sources"
          : name === "travelGuide"
            ? `travel:${destinationId}:travel-guide`
            : name === "manifest"
              ? `travel:${destinationId}:manifest`
              : name === "destination"
                ? `travel:${destinationId}:destination`
                : `travel:${destinationId}:${name}`,
    content,
  }));
}

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

  it("loads a complete persisted dataset through schema validation", async () => {
    const destinationId = "jaipur-in";
    mocks.findMany.mockResolvedValue(await persistedJaipurRows());

    const response = await GET(
      new Request("http://localhost/api/catalog/jaipur-in"),
      { params: Promise.resolve({ destination: destinationId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("database");
    expect(body.catalog.places).toHaveLength(4);
    expect(body.catalog.places[0]).toHaveProperty("verificationStatus");
    expect(body.catalog.places[0]).not.toHaveProperty("displayName");
  });

  it("falls back to checked-in data when persisted rows are incomplete", async () => {
    mocks.findMany.mockResolvedValue([
      { key: "travel:jaipur-in:destination", content: { invalid: true } },
    ]);
    const response = await GET(
      new Request("http://localhost/api/catalog/jaipur-in"),
      { params: Promise.resolve({ destination: "jaipur-in" }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe("checked_in");
  });

  it("rejects persisted guides citing candidate-only sources", async () => {
    const rows = await persistedJaipurRows();
    mocks.findMany.mockResolvedValue(
      rows.map((row) =>
        row.key === "travel:jaipur-in:travel-guide"
          ? {
              ...row,
              content: {
                ...asRecord(row.content),
                bestTimeToVisit: [
                  {
                    text: "Synthetic test claim",
                    sourceRefs: ["openstreetmap"],
                    freshnessDays: null,
                  },
                ],
              },
            }
          : row,
      ),
    );
    const response = await GET(
      new Request("http://localhost/api/catalog/jaipur-in"),
      { params: Promise.resolve({ destination: "jaipur-in" }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe("checked_in");
  });

  it("rejects persisted manifests whose dataset counts disagree", async () => {
    const rows = await persistedJaipurRows();
    mocks.findMany.mockResolvedValue(
      rows.map((row) => {
        if (row.key !== "travel:jaipur-in:manifest") return row;
        const manifest = asRecord(row.content);
        const datasets = asRecord(manifest.datasets);
        return {
          ...row,
          content: {
            ...manifest,
            datasets: {
              ...datasets,
              places: { ...asRecord(datasets.places), recordCount: 99 },
            },
          },
        };
      }),
    );
    const response = await GET(
      new Request("http://localhost/api/catalog/jaipur-in"),
      { params: Promise.resolve({ destination: "jaipur-in" }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe("checked_in");
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
