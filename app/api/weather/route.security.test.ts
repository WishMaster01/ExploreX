import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/observability/server-logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";
import { enforceRateLimit } from "@/lib/rate-limit";

afterEach(() => vi.unstubAllGlobals());

describe("public weather route hardening", () => {
  it("rejects out-of-range coordinates and URL injection before fetching", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(
        "https://explorex.test/api/weather?lat=999&lon=0&url=http://127.0.0.1",
      ),
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses only the fixed weather provider for valid coordinates", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        current: { temperature_2m: 21.7, weather_code: 1 },
        timezone: "Asia/Tokyo",
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request("https://explorex.test/api/weather?lat=35.6&lon=139.7"),
    );
    expect(response.status).toBe(200);
    expect(new URL(fetcher.mock.calls[0][0] as URL).hostname).toBe(
      "api.open-meteo.com",
    );
  });

  it("stops before provider access when the request is rate limited", async () => {
    const denied = NextResponse.json(
      {
        error: { code: "RATE_LIMITED" as const, message: "Too many requests" },
      },
      { status: 429 },
    );
    vi.mocked(enforceRateLimit).mockResolvedValueOnce(denied);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request("https://explorex.test/api/weather?city=Tokyo"),
    );
    expect(response.status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("masks upstream server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("internal provider diagnostics", { status: 500 }),
        ),
    );
    const response = await GET(
      new Request("https://explorex.test/api/weather?city=Tokyo"),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(
      "internal provider diagnostics",
    );
  });

  it("handles malformed provider data without exposing its contents", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ current: {} })),
    );
    const response = await GET(
      new Request("https://explorex.test/api/weather?city=Tokyo"),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Weather data is unavailable",
      },
    });
  });

  it("returns a structured timeout response", async () => {
    const timeout = new Error("private network detail");
    timeout.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    const response = await GET(
      new Request("https://explorex.test/api/weather?city=Tokyo"),
    );
    expect(response.status).toBe(504);
    expect(await response.text()).not.toContain("private network detail");
  });
});
