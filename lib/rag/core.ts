import { createHash } from "node:crypto";

export const RETRIEVABLE_STATUSES = [
  "VERIFIED",
  "PROVIDER_SOURCED",
  "CURATED",
] as const;
const retrievableStatusSet = new Set<string>(RETRIEVABLE_STATUSES);

export type KnowledgeDocumentInput = {
  sourceId: string;
  sourceDocumentId: string;
  title: string;
  content: string;
  destinationId?: string;
  categoryIds: string[];
  factTypes: string[];
  language: string;
  verificationStatus: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  storagePolicy: string;
  lastVerifiedAt?: string;
  latitude?: number;
  longitude?: number;
};

export function duplicateKnowledgeDocumentKeys(
  documents: readonly Pick<
    KnowledgeDocumentInput,
    "sourceId" | "sourceDocumentId"
  >[],
) {
  const counts = new Map<string, number>();
  for (const document of documents) {
    const key = `${document.sourceId}\u0000${document.sourceDocumentId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts].filter(([, count]) => count > 1).map(([key]) => key),
  );
}

export type KnowledgeChunkInput = {
  chunkIndex: number;
  content: string;
  contentHash: string;
};

export type RankedKnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  destinationId: string | null;
  categoryIds: string[];
  factTypes: string[];
  verificationStatus: string;
  sourceUrl: string;
  attribution: string;
  license: string;
  storagePolicy: string;
  lastVerifiedAt: string | null;
  sourceId: string;
  sourceName: string;
  score: number;
  retrievalMethods: string[];
};

export type PlannerEvidenceAssessment = {
  sufficient: boolean;
  reasons: string[];
  supportedPlaceNames: string[];
};

export function normalizeKnowledgeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashKnowledgeContent(value: string) {
  return createHash("sha256")
    .update(normalizeKnowledgeText(value))
    .digest("hex");
}

export function chunkKnowledgeText(
  value: string,
  options: { maxWords?: number; overlapWords?: number } = {},
): KnowledgeChunkInput[] {
  const maxWords = options.maxWords ?? 220;
  const overlapWords = options.overlapWords ?? 32;
  if (
    !Number.isInteger(maxWords) ||
    maxWords < 16 ||
    !Number.isInteger(overlapWords) ||
    overlapWords < 0 ||
    overlapWords >= maxWords
  )
    throw new Error("Invalid knowledge chunk size");
  const words = normalizeKnowledgeText(value).split(" ").filter(Boolean);
  const chunks: KnowledgeChunkInput[] = [];
  for (let start = 0; start < words.length; ) {
    const content = words.slice(start, start + maxWords).join(" ");
    if (!content) break;
    chunks.push({
      chunkIndex: chunks.length,
      content,
      contentHash: hashKnowledgeContent(content),
    });
    if (start + maxWords >= words.length) break;
    start += maxWords - overlapWords;
  }
  return chunks;
}

function terms(value: string): string[] {
  return (
    normalizeKnowledgeText(value)
      .toLocaleLowerCase("en")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

/** BM25 ranker used for offline evaluation and ranking the bounded FTS candidate set. */
export function rankBm25<
  T extends { id: string; content: string; title?: string },
>(query: string, documents: readonly T[]): Array<T & { score: number }> {
  const queryTerms = [...new Set(terms(query))];
  if (!queryTerms.length || !documents.length) return [];
  const tokenized = documents.map((document) =>
    terms(`${document.title ?? ""} ${document.content}`),
  );
  const averageLength =
    tokenized.reduce((sum, documentTerms) => sum + documentTerms.length, 0) /
    documents.length;
  const k1 = 1.2;
  const b = 0.75;
  const ranked = documents.map((document, index) => {
    const documentTerms = tokenized[index] ?? [];
    let score = 0;
    for (const term of queryTerms) {
      const frequency = documentTerms.filter((item) => item === term).length;
      if (!frequency) continue;
      const documentFrequency = tokenized.filter((items) =>
        items.includes(term),
      ).length;
      const idf = Math.log(
        1 +
          (documents.length - documentFrequency + 0.5) /
            (documentFrequency + 0.5),
      );
      const denominator =
        frequency +
        k1 *
          (1 -
            b +
            b * (averageLength ? documentTerms.length / averageLength : 0));
      score += idf * ((frequency * (k1 + 1)) / denominator);
    }
    return { ...document, score };
  });
  return ranked
    .filter((document) => document.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    );
}

export function reciprocalRankFusion<T extends { id: string }>(
  lists: readonly (readonly T[])[],
  rankConstant = 60,
): Array<T & { score: number; retrievalMethods: string[] }> {
  const merged = new Map<
    string,
    { document: T; score: number; retrievalMethods: Set<string> }
  >();
  for (const [listIndex, list] of lists.entries()) {
    const method = listIndex === 0 ? "semantic" : "keyword";
    for (const [rank, document] of list.entries()) {
      const existing = merged.get(document.id) ?? {
        document,
        score: 0,
        retrievalMethods: new Set<string>(),
      };
      existing.score += 1 / (rankConstant + rank + 1);
      existing.retrievalMethods.add(method);
      merged.set(document.id, existing);
    }
  }
  return [...merged.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.document.id.localeCompare(right.document.id),
    )
    .map(({ document, score, retrievalMethods }) => ({
      ...document,
      score,
      retrievalMethods: [...retrievalMethods],
    }));
}

export function assessPlannerEvidence(
  documents: readonly Pick<
    RankedKnowledgeDocument,
    "title" | "factTypes" | "verificationStatus"
  >[],
): PlannerEvidenceAssessment {
  const accepted = documents.filter((document) =>
    retrievableStatusSet.has(document.verificationStatus),
  );
  const factTypes = new Set(accepted.flatMap((document) => document.factTypes));
  const placeNames = accepted
    .filter((document) => document.factTypes.includes("place_name"))
    .map((document) => document.title);
  const reasons: string[] = [];
  if (!factTypes.has("destination_identity"))
    reasons.push("No sourced destination identity was retrieved.");
  if (placeNames.length < 3)
    reasons.push("Fewer than three sourced place names are available.");
  if (!factTypes.has("place_coordinates"))
    reasons.push("Sourced coordinates for itinerary places are unavailable.");
  if (!factTypes.has("place_address"))
    reasons.push("Sourced addresses for itinerary places are unavailable.");
  if (!factTypes.has("place_details"))
    reasons.push("Sourced attraction details are unavailable.");
  if (!factTypes.has("accommodation"))
    reasons.push("Sourced accommodation records are unavailable.");
  if (!factTypes.has("accommodation_price"))
    reasons.push("Sourced accommodation prices are unavailable.");
  if (!factTypes.has("accommodation_coordinates"))
    reasons.push("Sourced accommodation coordinates are unavailable.");
  if (!factTypes.has("accommodation_rating"))
    reasons.push("Sourced accommodation ratings are unavailable.");
  if (!factTypes.has("accommodation_address"))
    reasons.push("Sourced accommodation addresses are unavailable.");
  return {
    sufficient: reasons.length === 0,
    reasons,
    supportedPlaceNames: placeNames,
  };
}

export function recallAtK(
  rankedIds: readonly string[],
  relevantIds: readonly string[],
  k: number,
) {
  if (!relevantIds.length) return null;
  const retrieved = new Set(rankedIds.slice(0, k));
  return (
    relevantIds.filter((id) => retrieved.has(id)).length / relevantIds.length
  );
}

export function reciprocalRank(
  rankedIds: readonly string[],
  relevantIds: readonly string[],
) {
  const relevant = new Set(relevantIds);
  const rank = rankedIds.findIndex((id) => relevant.has(id));
  return rank < 0 ? 0 : 1 / (rank + 1);
}
