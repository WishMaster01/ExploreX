import { describe, expect, it } from "vitest";
import { googleMapsDirectionsUrl, googleMapsPlaceSearchUrl } from "./maps";

describe("Google Maps links", () => {
  it("searches by place name instead of unverified coordinates", () => {
    const url = googleMapsPlaceSearchUrl("Hawa Mahal, Jaipur");
    expect(url).toContain("query=Hawa%20Mahal%2C%20Jaipur");
    expect(url).not.toMatch(/\d+\.\d+%2C\d+\.\d+/);
  });

  it("builds directions from place names and requires two usable stops", () => {
    expect(googleMapsDirectionsUrl(["Amber Palace", "City Palace"])).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=Amber%20Palace&destination=City%20Palace",
    );
    expect(
      googleMapsDirectionsUrl(["Amber Palace", "Hawa Mahal", "City Palace"]),
    ).toContain("waypoints=Hawa%20Mahal");
    expect(googleMapsDirectionsUrl(["", "Amber Palace"])).toBeNull();
  });
});
