import { levenshteinDistance } from "./levenshtein";

export type SearchableItem = {
  label: string;
  aliases?: string[];
  popularity?: number;
};

export function fuzzySearch<T extends SearchableItem>(
  query: string,
  items: T[],
  limit = 8,
): Array<T & { matchScore: number }> {
  const normalizedQuery = query.toLocaleLowerCase().trim();
  if (!normalizedQuery) return [];

  return items
    .map((item) => {
      const candidates = [item.label, ...(item.aliases ?? [])].map((value) =>
        value.toLocaleLowerCase(),
      );
      const best = candidates.reduce((score, candidate) => {
        const words = candidate.split(/[\s,/-]+/).filter(Boolean);
        const distance = Math.min(
          levenshteinDistance(normalizedQuery, candidate),
          ...words.map((word) => levenshteinDistance(normalizedQuery, word)),
        );
        const prefixBonus = candidate.startsWith(normalizedQuery) ? 0.45 : 0;
        const containsBonus = candidate.includes(normalizedQuery) ? 0.2 : 0;
        const denominator = Math.max(normalizedQuery.length, Math.min(candidate.length, normalizedQuery.length + 3));
        return Math.max(score, 1 - distance / denominator + prefixBonus + containsBonus);
      }, Number.NEGATIVE_INFINITY);

      return {
        ...item,
        matchScore: best + Math.min(item.popularity ?? 0, 100) / 1000,
      };
    })
    .filter((item) => item.matchScore >= (normalizedQuery.length <= 2 ? 0.65 : 0.28))
    .sort((a, b) => b.matchScore - a.matchScore || a.label.localeCompare(b.label))
    .slice(0, Math.max(0, limit));
}

