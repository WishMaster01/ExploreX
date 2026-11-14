import { describe, expect, it } from "vitest";
import {
  canEditDiscovery,
  discoveryDraftSchema,
  findDuplicate,
  publicDiscoveryLocation,
  rankDiscovery,
  submissionLimitReached,
} from "./policy";

describe("community discovery policy", () => {
  it("requires explicit publication consent and paired valid coordinates", () => {
    const valid = {
      title: "Quiet pottery workshop",
      description:
        "A small local studio offers hands-on pottery classes for visitors.",
      destinationId: "jaipur-in",
      category: "craft",
      consentToPublish: true,
      sensitiveLocation: false,
    };
    expect(discoveryDraftSchema.safeParse(valid).success).toBe(true);
    expect(
      discoveryDraftSchema.safeParse({ ...valid, consentToPublish: false })
        .success,
    ).toBe(false);
    expect(
      discoveryDraftSchema.safeParse({ ...valid, latitude: 26.9 }).success,
    ).toBe(false);
    expect(
      discoveryDraftSchema.safeParse({ ...valid, latitude: 91, longitude: 75 })
        .success,
    ).toBe(false);
  });

  it("detects normalized destination/category/title duplicates", () => {
    const draft = {
      destinationId: "jaipur-in",
      category: "craft",
      title: "Pottery & Tea",
    };
    expect(
      findDuplicate(draft, [
        { ...draft, id: "existing", title: " pottery tea " },
      ])?.id,
    ).toBe("existing");
    expect(
      findDuplicate(draft, [
        { ...draft, id: "other", destinationId: "udaipur-in" },
      ]),
    ).toBeNull();
  });

  it("restricts edits to an owner's pending or correction-requested submission and caps spam", () => {
    expect(
      canEditDiscovery({ contributorId: "a", userId: "a", status: "PENDING" }),
    ).toBe(true);
    expect(
      canEditDiscovery({ contributorId: "a", userId: "b", status: "PENDING" }),
    ).toBe(false);
    expect(
      canEditDiscovery({ contributorId: "a", userId: "a", status: "APPROVED" }),
    ).toBe(false);
    expect(submissionLimitReached(4)).toBe(false);
    expect(submissionLimitReached(5)).toBe(true);
  });

  it("uses bounded transparent engagement signals and penalizes inaccurate reports", () => {
    const base = {
      category: "craft",
      savedCount: 100,
      recommendationCount: 100,
      reportedVisitCount: 10,
      satisfactionAverage: 4,
      submittedAt: new Date(),
      inaccurateReportCount: 0,
    };
    expect(rankDiscovery(base)).toBeLessThan(50);
    expect(rankDiscovery({ ...base, inaccurateReportCount: 2 })).toBeLessThan(
      rankDiscovery(base),
    );
    expect(rankDiscovery(base, ["craft"])).toBe(rankDiscovery(base) + 2);
  });

  it("withholds all precise and labeled location data for sensitive discoveries", () => {
    expect(
      publicDiscoveryLocation({
        sensitiveLocation: true,
        locationLabel: "Hidden valley",
        latitude: 27,
        longitude: 75,
      }),
    ).toEqual({ locationLabel: null, latitude: null, longitude: null });
    expect(
      publicDiscoveryLocation({
        sensitiveLocation: false,
        locationLabel: "Old town",
        latitude: 27,
        longitude: 75,
      }),
    ).toEqual({ locationLabel: "Old town", latitude: 27, longitude: 75 });
  });
});
