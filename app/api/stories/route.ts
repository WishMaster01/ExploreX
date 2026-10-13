import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exploreCities } from "@/lib/data/cities";
import "server-only";

export async function GET() {
  try {
    let dbTrips: Array<{
      id: string;
      destination: string;
      origin: string | null;
      duration: string | null;
      budget: string | null;
      createdAt: Date;
      user: { name: string; imageUrl: string | null };
    }> = [];

    try {
      dbTrips = await prisma.trip.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          destination: true,
          origin: true,
          duration: true,
          budget: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
        },
      });
    } catch {
      dbTrips = [];
    }

    if (dbTrips.length > 0) {
      const formatted = dbTrips.map((trip) => {
        const cityMatch = exploreCities.find((c) =>
          trip.destination.toLowerCase().includes(c.name.toLowerCase()),
        );

        return {
          id: trip.id,
          location: trip.destination,
          origin: trip.origin,
          duration: trip.duration || "Self-paced",
          budget: trip.budget || "Custom",
          date: trip.createdAt.toISOString().split("T")[0],
          author: trip.user.name,
          avatar:
            trip.user.imageUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
          image:
            cityMatch?.image ||
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
          summary: cityMatch
            ? cityMatch.tagline
            : `Verified itinerary planned for ${trip.destination}`,
          source: "database",
        };
      });

      return NextResponse.json({
        success: true,
        source: "database_records",
        stories: formatted,
      });
    }

    // When the database has no trips yet, provide real server destination profiles
    const fallbackStories = exploreCities.slice(0, 3).map((city) => ({
      id: city.slug,
      location: `${city.name}, ${city.country}`,
      origin: "ExploreX Studio",
      duration: city.idealDuration,
      budget: city.estimatedDailyCost,
      date: new Date().toISOString().split("T")[0],
      author: `${city.name} Guide`,
      avatar: city.image,
      image: city.image,
      summary: city.summary,
      source: "server_destinations",
    }));

    return NextResponse.json({
      success: true,
      source: "server_destinations",
      stories: fallbackStories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load community stories",
      },
      { status: 500 },
    );
  }
}
