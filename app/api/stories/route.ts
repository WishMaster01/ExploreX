import { NextResponse } from "next/server";
import { exploreCities } from "@/lib/data/cities";
import "server-only";

/**
 * Public traveler stories are currently curated destination profiles.
 * Private trip records must never be published without an explicit sharing
 * and consent model.
 */
export async function GET() {
  const stories = exploreCities.slice(0, 3).map((city) => ({
    id: city.slug,
    location: `${city.name}, ${city.country}`,
    origin: "ExploreX Studio",
    duration: city.idealDuration,
    budget: city.estimatedDailyCost,
    date: null,
    author: `${city.name} Guide`,
    avatar: city.image,
    image: city.image,
    summary: city.summary,
    source: "server_destinations",
  }));

  return NextResponse.json({
    success: true,
    source: "server_destinations",
    stories,
  });
}
