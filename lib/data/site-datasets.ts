import { prisma } from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";
import { LruTtlCache } from "@/lib/algorithms/cache/lru-ttl-cache";
import { serverLogger } from "@/lib/observability/server-logger";
import "server-only";

const datasetCache = new LruTtlCache<unknown>(
  APP_CONFIG.cache.siteDatasetEntries,
  APP_CONFIG.cache.siteDatasetTtlMs,
);

/** Read curated content from PostgreSQL with a bounded per-process cache and fallback. */
export async function loadSiteDataset<T>(key: string, fallback: T): Promise<T> {
  const cached = await datasetCache.get(key);
  if (cached !== undefined) {
    serverLogger.info("cache.site_dataset.hit", { dataset: key });
    return cached as T;
  }
  serverLogger.info("cache.site_dataset.miss", { dataset: key });
  try {
    const record = await prisma.siteDataset.findUnique({
      where: { key },
      select: { content: true },
    });
    if (record?.content !== undefined) {
      await datasetCache.set(key, record.content);
      return record.content as T;
    }
  } catch {
    // The checked-in dataset remains available while a database is being set up.
  }
  await datasetCache.set(key, fallback);
  return fallback;
}
