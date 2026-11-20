import { describe, expect, it } from "vitest";
import { createTripPlanCacheKey } from "./cache-key";

const base = {
  userId: "user-a",
  promptVersion: "planner-v1",
  model: "test-model",
  messages: [{ role: "user", content: "Plan a Jaipur trip" }],
};

describe("trip plan cache isolation", () => {
  it("keeps the same request stable for one user", () => {
    expect(createTripPlanCacheKey(base)).toBe(createTripPlanCacheKey(base));
  });

  it("separates users, models, prompts, and message payloads", () => {
    const baseKey = createTripPlanCacheKey(base);
    expect(createTripPlanCacheKey({ ...base, userId: "user-b" })).not.toBe(
      baseKey,
    );
    expect(createTripPlanCacheKey({ ...base, model: "other-model" })).not.toBe(
      baseKey,
    );
    expect(
      createTripPlanCacheKey({ ...base, promptVersion: "planner-v2" }),
    ).not.toBe(baseKey);
    expect(
      createTripPlanCacheKey({
        ...base,
        messages: [{ role: "user", content: "Plan a Delhi trip" }],
      }),
    ).not.toBe(baseKey);
  });
});
