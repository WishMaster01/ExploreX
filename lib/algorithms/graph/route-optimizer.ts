import {
  haversineDistanceKm,
  isValidCoordinates,
  type Coordinates,
} from "./haversine";

export type LocatedItem = { geo_coordinates: Coordinates };
export type RouteDistanceSource =
  | "STRAIGHT_LINE_ESTIMATE"
  | "PROVIDER_ROUTE"
  | "MIXED_ESTIMATE"
  | "UNAVAILABLE";

export type RouteOptions<T> = {
  distanceBetween?: (
    from: T | Coordinates,
    to: T | Coordinates,
  ) => number | undefined;
  source?: RouteDistanceSource;
};

function routeDistance<T extends LocatedItem>(
  route: T[],
  start?: Coordinates,
): number {
  if (!route.length) return 0;
  let distance =
    start && isValidCoordinates(start)
      ? haversineDistanceKm(start, route[0].geo_coordinates)
      : 0;
  for (let index = 1; index < route.length; index += 1) {
    distance += haversineDistanceKm(
      route[index - 1].geo_coordinates,
      route[index].geo_coordinates,
    );
  }
  return distance;
}

function twoOpt<T extends LocatedItem>(route: T[], start?: Coordinates): T[] {
  let best = [...route];
  let bestDistance = routeDistance(best, start);
  let improved = true;

  for (let pass = 0; pass < 3 && improved; pass += 1) {
    improved = false;
    for (let left = 0; left < best.length - 1; left += 1) {
      for (let right = left + 1; right < best.length; right += 1) {
        const candidate = [
          ...best.slice(0, left),
          ...best.slice(left, right + 1).reverse(),
          ...best.slice(right + 1),
        ];
        const distance = routeDistance(candidate, start);
        if (distance + 0.001 < bestDistance) {
          best = candidate;
          bestDistance = distance;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute<T extends LocatedItem>(
  items: T[],
  start?: Coordinates,
  options: RouteOptions<T> = {},
): {
  items: T[];
  totalDistanceKm: number;
  savedDistanceKm: number;
  distanceSource: RouteDistanceSource;
} {
  // Coordinate algorithms remain the fallback. Provider-backed edge costs can be
  // supplied by callers that have actual routing data; never label Haversine as road distance.
  let source: RouteDistanceSource = options.distanceBetween
    ? (options.source ?? "PROVIDER_ROUTE")
    : "STRAIGHT_LINE_ESTIMATE";
  let providerEdges = 0;
  let usedFallback = false;
  const edgeDistance = (from: T | Coordinates, to: T | Coordinates) => {
    const providerDistance = options.distanceBetween?.(from, to);
    if (
      providerDistance !== undefined &&
      Number.isFinite(providerDistance) &&
      providerDistance >= 0
    ) {
      providerEdges += 1;
      return providerDistance;
    }
    if (options.distanceBetween) source = "STRAIGHT_LINE_ESTIMATE";
    if (options.distanceBetween) usedFallback = true;
    const a = "geo_coordinates" in from ? from.geo_coordinates : from;
    const b = "geo_coordinates" in to ? to.geo_coordinates : to;
    if (!isValidCoordinates(a) || !isValidCoordinates(b)) return 0;
    return haversineDistanceKm(a, b);
  };
  const distance = (route: T[]) => {
    if (!route.length) return 0;
    let total = start ? edgeDistance(start, route[0]) : 0;
    for (let i = 1; i < route.length; i += 1)
      total += edgeDistance(route[i - 1], route[i]);
    return total;
  };
  const valid = items.filter((item) =>
    isValidCoordinates(item.geo_coordinates),
  );
  if (valid.length !== items.length || items.length === 0) {
    return {
      items: [...items],
      totalDistanceKm: 0,
      savedDistanceKm: 0,
      distanceSource: "UNAVAILABLE",
    };
  }
  if (items.length < 2) {
    const totalDistanceKm = distance(valid);
    return {
      items: [...items],
      totalDistanceKm,
      savedDistanceKm: 0,
      distanceSource: providerEdges
        ? usedFallback
          ? "MIXED_ESTIMATE"
          : source
        : "STRAIGHT_LINE_ESTIMATE",
    };
  }

  const originalDistance = distance(items);
  const remaining = [...items];
  const ordered: T[] = [];
  let current =
    start && isValidCoordinates(start) ? start : remaining[0].geo_coordinates;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((item, index) => {
      const edge = edgeDistance(current, item);
      if (edge < nearestDistance) {
        nearestDistance = edge;
        nearestIndex = index;
      }
    });
    const [nearest] = remaining.splice(nearestIndex, 1);
    ordered.push(nearest);
    current = nearest.geo_coordinates;
  }

  // Nearest-neighbor and 2-opt use the same metric when supplied, preserving objective consistency.
  let optimized = ordered;
  if (!options.distanceBetween) optimized = twoOpt(ordered, start);
  else {
    let best = [...ordered];
    let bestDistance = distance(best);
    for (let pass = 0; pass < 3; pass += 1) {
      let improved = false;
      for (let left = 0; left < best.length - 1; left += 1)
        for (let right = left + 1; right < best.length; right += 1) {
          const candidate = [
            ...best.slice(0, left),
            ...best.slice(left, right + 1).reverse(),
            ...best.slice(right + 1),
          ];
          const candidateDistance = distance(candidate);
          if (candidateDistance + 0.001 < bestDistance) {
            best = candidate;
            bestDistance = candidateDistance;
            improved = true;
          }
        }
      if (!improved) break;
    }
    optimized = best;
  }
  const totalDistanceKm = distance(optimized);
  if (providerEdges === 0) source = "STRAIGHT_LINE_ESTIMATE";
  else if (usedFallback) source = "MIXED_ESTIMATE";
  return {
    items: optimized,
    totalDistanceKm,
    savedDistanceKm: Math.max(0, originalDistance - totalDistanceKm),
    distanceSource: source,
  };
}
