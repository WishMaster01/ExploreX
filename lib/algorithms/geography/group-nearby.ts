import {
  haversineDistanceKm,
  isValidCoordinates,
  type Coordinates,
} from "../graph/haversine";

export type GeographicCandidate = {
  place_name?: string;
  geo_coordinates?: Coordinates | null;
};

export type GeographicGroups<T> = {
  groups: T[][];
  unlocated: T[];
  duplicateCount: number;
};

/** Greedy, deterministic radius grouping. Input is capped to keep work bounded. */
export function groupNearbyPlaces<T extends GeographicCandidate>(
  candidates: readonly T[],
  radiusKm = 3,
  maxCandidates = 2_000,
): GeographicGroups<T> {
  const radius = Number.isFinite(radiusKm)
    ? Math.max(0, Math.min(100, radiusKm))
    : 3;
  const unique: T[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  const unlocated: T[] = [];
  for (const candidate of candidates.slice(0, Math.max(0, maxCandidates))) {
    const point = candidate.geo_coordinates;
    if (!isValidCoordinates(point)) {
      unlocated.push(candidate);
      continue;
    }
    const key = `${(candidate.place_name ?? "").trim().toLocaleLowerCase("en")}|${point.latitude.toFixed(5)}|${point.longitude.toFixed(5)}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    unique.push(candidate);
  }

  const groups: T[][] = [];
  const centers: Coordinates[] = [];
  for (const candidate of unique) {
    const point = candidate.geo_coordinates!;
    let index = centers.findIndex(
      (center) => haversineDistanceKm(center, point) <= radius,
    );
    if (index < 0) {
      groups.push([candidate]);
      centers.push({ ...point });
      continue;
    }
    groups[index]!.push(candidate);
    const group = groups[index]!;
    centers[index] = {
      latitude:
        group.reduce((sum, item) => sum + item.geo_coordinates!.latitude, 0) /
        group.length,
      longitude:
        group.reduce((sum, item) => sum + item.geo_coordinates!.longitude, 0) /
        group.length,
    };
  }
  return { groups, unlocated, duplicateCount };
}
