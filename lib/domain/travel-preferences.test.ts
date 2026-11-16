import { describe, expect, it } from "vitest";
import { travelPreferencesSchema } from "./travel-preferences";

describe("travel preferences", () => {
  it("provides usable defaults and accepts planner-compatible values", () => {
    expect(travelPreferencesSchema.parse({})).toEqual({
      currency: "INR",
      style: "balanced",
      interests: "",
      accommodation: "",
      food: "",
      transport: "",
      walking: "moderate",
    });
    expect(
      travelPreferencesSchema.safeParse({
        currency: "USD",
        style: "slow travel",
        walking: "low",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed currency and unknown planner style", () => {
    expect(
      travelPreferencesSchema.safeParse({
        currency: "INR;DROP",
        style: "anything",
      }).success,
    ).toBe(false);
  });
});
