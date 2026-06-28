import { apiError, apiOk, boundedString } from "@/lib/api";
import { LruTtlCache } from "@/lib/algorithms/cache/lru-ttl-cache";
import { fuzzySearch } from "@/lib/algorithms/search/fuzzy-search";
import { Trie } from "@/lib/algorithms/search/trie";
import { DESTINATIONS } from "@/lib/data/destinations";
import { enforceRateLimit } from "@/lib/rate-limit";

const destinationCache = new LruTtlCache<typeof DESTINATIONS>(100, 10 * 60_000);
const labelTrie = new Trie(DESTINATIONS.flatMap((destination) => [
  destination.label,
  destination.city,
  destination.country,
  ...(destination.state ? [destination.state] : []),
]));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = boundedString(url.searchParams.get("q"), 80);
  const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit") ?? 8) || 8));
  if (query.length < 2) return apiOk({ suggestions: [] });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const denied = await enforceRateLimit(request, {
    capacity: 90,
    interval: 60,
    refillRate: 60,
    userId: `destination:${ip}`,
  });
  if (denied) return denied;

  const cacheKey = `${query.toLocaleLowerCase()}:${limit}`;
  const cached = await destinationCache.get(cacheKey);
  if (cached) return apiOk({ suggestions: cached });

  try {
    const prefixLabels = new Set(labelTrie.search(query, limit * 2));
    const ranked = fuzzySearch(
      query,
      DESTINATIONS.map((destination) => ({
        ...destination,
        aliases: [
          ...(destination.aliases ?? []),
          destination.city,
          destination.country,
          ...(destination.state ? [destination.state] : []),
        ],
        popularity: destination.popularity + (prefixLabels.has(destination.label) || prefixLabels.has(destination.city) ? 20 : 0),
      })),
      limit,
    ).map(({ matchScore, ...destination }) => ({ ...destination, matchScore: Math.round(matchScore * 1000) / 1000 }));
    await destinationCache.set(cacheKey, ranked);
    return apiOk({ suggestions: ranked });
  } catch {
    return apiError("Destination search is unavailable", 503, "SERVICE_UNAVAILABLE");
  }
}
