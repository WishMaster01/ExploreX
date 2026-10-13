import { prisma } from "@/lib/db";
import "server-only";

/** Read curated content from PostgreSQL when seeded, keeping a local fallback for recovery. */
export async function loadSiteDataset<T>(key: string, fallback: T): Promise<T> {
  try {
    const record = await prisma.siteDataset.findUnique({
      where: { key },
      select: { content: true },
    });
    if (record?.content !== undefined) return record.content as T;
  } catch {
    // The checked-in dataset remains available while a database is being set up.
  }
  return fallback;
}
