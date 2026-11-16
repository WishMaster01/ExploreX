import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/stories privacy boundary", () => {
  it("does not present curated destination profiles as traveler stories", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("no_published_stories");
    expect(body.stories).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(
      /database_records|user@example\.com|private trip/i,
    );
  });
});
