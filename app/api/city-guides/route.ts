import { apiOk } from "@/lib/api";
import { exploreCities } from "@/lib/data/cities";
import { prisma } from "@/lib/db";
import "server-only";

export async function GET() {
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
        source: "database",
      });
    }
  } catch {
    // Public catalog remains available from its curated seed while DB is offline.
  }
  return apiOk({ cities: exploreCities, source: "curated_seed" });
}
