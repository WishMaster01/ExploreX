import { NextResponse } from "next/server";
import { DESTINATIONS } from "@/lib/data/destinations";
import { exploreCities } from "@/lib/data/cities";
import { travelSignals } from "@/lib/data/travel-signals";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import "server-only";

export async function GET() {
  try {
    const [destinations, signals] = await Promise.all([
      loadSiteDataset("destinations", DESTINATIONS),
      loadSiteDataset("travel-signals", travelSignals),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        destinationsIndexed: destinations.length,
        curatedCityGuides: exploreCities.length,
        travelSignalsMonitored: signals.length,
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
