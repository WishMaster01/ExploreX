import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/health/database-probe", () => ({
  probeDatabase: vi.fn(),
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET as live } from "./live/route";
import { GET as ready } from "./ready/route";
import { probeDatabase } from "@/lib/health/database-probe";

afterEach(() => vi.restoreAllMocks());

describe("health endpoints", () => {
  it("reports process liveness without checking dependencies", async () => {
    const response = await live();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(probeDatabase).not.toHaveBeenCalled();
  });

  it("reports database readiness and propagates a correlation ID", async () => {
    vi.mocked(probeDatabase).mockResolvedValueOnce();
    const request = new Request("https://explorex.test/api/health/ready", {
      headers: { "x-request-id": "f313e576-c7d5-4a1b-8d92-52cabfc523fb" },
    });
    const response = await ready(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe(
      "f313e576-c7d5-4a1b-8d92-52cabfc523fb",
    );
  });

  it("returns generic not-ready details on database failure", async () => {
    vi.mocked(probeDatabase).mockRejectedValueOnce(
      new Error("private db detail"),
    );
    const response = await ready(
      new Request("https://explorex.test/api/health/ready"),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      dependencies: { database: "unavailable" },
    });
  });
});
