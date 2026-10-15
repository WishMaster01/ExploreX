import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/stories privacy boundary", () => {
  it("serves curated public destination profiles without user trip data", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("server_destinations");
    expect(body.stories.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(
      /database_records|user@example\.com|private trip/i,
    );
    expect(
      body.stories.every(
        (story: { source: string; id: string }) =>
          story.source === "server_destinations" &&
          !/^c[a-z0-9]{20,}$/i.test(story.id),
      ),
    ).toBe(true);
  });
});
