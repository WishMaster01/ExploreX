import { apiOk } from "@/lib/api";
import { exploreCities } from "@/lib/data/cities";
import { prisma } from "@/lib/db";
import "server-only";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return apiOk({ cities: [], source: "no_reviewed_guides" });
  }
  try {
    const records = await prisma.cityGuide.findMany({
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: { content: true },
    });
    if (records.length) {
      return apiOk({
        cities: records.map(
          (record) => record.content as (typeof exploreCities)[number],
        ),
        source: "development_database",
      });
    }
  } catch {
    // Public catalog remains available from its curated seed while DB is offline.
  }
  return apiOk({ cities: exploreCities, source: "demo_seed" });
}
