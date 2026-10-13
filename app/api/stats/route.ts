import { NextResponse } from "next/server";
import { DESTINATIONS } from "@/lib/data/destinations";
import { exploreCities } from "@/lib/data/cities";
import { travelSignals } from "@/lib/data/travel-signals";
import { prisma } from "@/lib/db";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import "server-only";

export async function GET() {
  try {
    const [destinations, signals] = await Promise.all([
      loadSiteDataset("destinations", DESTINATIONS),
      loadSiteDataset("travel-signals", travelSignals),
    ]);
    let tripCount = 0;
    let userCount = 0;

    try {
      [tripCount, userCount] = await Promise.all([
        prisma.trip.count(),
        prisma.user.count(),
      ]);
    } catch {
      // Fallback if DB is unavailable or unmigrated in this environment
      tripCount = 0;
      userCount = 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        destinationsIndexed: destinations.length,
        curatedCityGuides: exploreCities.length,
        travelSignalsMonitored: signals.length,
        itinerariesPlanned: tripCount,
        registeredTravelers: userCount,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load server stats",
      },
      { status: 500 },
    );
  }
}
