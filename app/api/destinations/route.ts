import { apiError, apiOk, boundedString } from "@/lib/api";
import { LruTtlCache } from "@/lib/algorithms/cache/lru-ttl-cache";
import { fuzzySearch } from "@/lib/algorithms/search/fuzzy-search";
import { Trie } from "@/lib/algorithms/search/trie";
import { DESTINATIONS } from "@/lib/data/destinations";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { parseDestinationSearchQuery } from "@/lib/domain/schemas";
import "server-only";

const destinationCache = new LruTtlCache<typeof DESTINATIONS>(
  APP_CONFIG.cache.destinationEntries,
  APP_CONFIG.cache.destinationTtlMs,
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = parseDestinationSearchQuery(url.searchParams);
  if (!parsedQuery)
    return apiError(
      "Destination query parameters are invalid",
      400,
      "VALIDATION_ERROR",
    );
  const query = boundedString(parsedQuery.q, 80);
  const defaultLimit = APP_CONFIG.pagination.defaultDestinations;
  const limit = Math.min(
    APP_CONFIG.pagination.maxDestinations,
    parsedQuery.limit ?? defaultLimit,
  );
  if (query.length < 2) return apiOk({ suggestions: [] });

  const policy = APP_CONFIG.rateLimits.destination;
  const denied = await enforceRateLimit(request, {
    capacity: policy.capacity,
    interval: policy.interval,
    refillRate: policy.refillRate,
    userId: "destination:public",
    keyByIp: true,
  });
  if (denied) return denied;

  const cacheKey = `${query.toLocaleLowerCase()}:${limit}`;
  const cached = await destinationCache.get(cacheKey);
  if (cached) return apiOk({ suggestions: cached });

  try {
    const destinations = await loadSiteDataset("destinations", DESTINATIONS);
    const labelTrie = new Trie(
      destinations.flatMap((destination) => [
        destination.label,
        destination.city,
        destination.country,
        ...(destination.state ? [destination.state] : []),
      ]),
    );
    const prefixLabels = new Set(labelTrie.search(query, limit * 2));
    const ranked = fuzzySearch(
      query,
      destinations.map((destination) => ({
        ...destination,
        aliases: [
          ...(destination.aliases ?? []),
          destination.city,
          destination.country,
          ...(destination.state ? [destination.state] : []),
        ],
        popularity:
          destination.popularity +
          (prefixLabels.has(destination.label) ||
          prefixLabels.has(destination.city)
            ? 20
            : 0),
      })),
      limit,
    ).map(({ matchScore, ...destination }) => ({
      ...destination,
      matchScore: Math.round(matchScore * 1000) / 1000,
    }));
    await destinationCache.set(cacheKey, ranked);
    return apiOk({ suggestions: ranked });
  } catch {
    return apiError(
      "Destination search is unavailable",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
