import { haversineDistanceKm, isValidCoordinates, type Coordinates } from "./haversine";

export type LocatedItem = { geo_coordinates: Coordinates };

function routeDistance<T extends LocatedItem>(route: T[], start?: Coordinates): number {
  if (!route.length) return 0;
  let distance = start && isValidCoordinates(start)
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
): { items: T[]; totalDistanceKm: number; savedDistanceKm: number } {
  const valid = items.filter((item) => isValidCoordinates(item.geo_coordinates));
  if (valid.length !== items.length || items.length < 2) {
    return { items: [...items], totalDistanceKm: routeDistance(valid, start), savedDistanceKm: 0 };
  }

  const originalDistance = routeDistance(items, start);
  const remaining = [...items];
  const ordered: T[] = [];
  let current = start && isValidCoordinates(start) ? start : remaining[0].geo_coordinates;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((item, index) => {
      const distance = haversineDistanceKm(current, item.geo_coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const [nearest] = remaining.splice(nearestIndex, 1);
    ordered.push(nearest);
    current = nearest.geo_coordinates;
  }

  const optimized = twoOpt(ordered, start);
  const totalDistanceKm = routeDistance(optimized, start);
  return {
    items: optimized,
    totalDistanceKm,
    savedDistanceKm: Math.max(0, originalDistance - totalDistanceKm),
  };
}

