import { describe, expect, it } from "vitest";
import {
  exploreCategories,
  findExploreCategory,
  getJaipurCategoryPlaces,
} from "./india-explore";

describe("India taxonomy discovery", () => {
  it("exposes each category and additional taxonomy tag as an indexable route", () => {
    expect(exploreCategories.length).toBeGreaterThanOrEqual(19);
    expect(findExploreCategory("heritage")?.name).toBe("Heritage");
    expect(findExploreCategory("village_tourism")?.name).toBe(
      "Village tourism",
    );
    expect(findExploreCategory("unlisted-theme")).toBeNull();
  });

  it("filters Jaipur only from its checked taxonomy assignments", () => {
    const heritage = findExploreCategory("heritage");
    const beaches = findExploreCategory("beaches");
    expect(heritage).not.toBeNull();
    expect(getJaipurCategoryPlaces(heritage!).map(({ name }) => name)).toEqual([
      "Amber Palace",
      "City Palace",
      "Jantar Mantar",
      "Hawa Mahal",
    ]);
    expect(getJaipurCategoryPlaces(beaches!)).toEqual([]);
  });
});
