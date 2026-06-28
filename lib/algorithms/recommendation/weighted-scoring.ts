import { haversineDistanceKm, isValidCoordinates, type Coordinates } from "../graph/haversine";

export type HotelCandidate = {
  rating: number;
  price_per_night: string;
  geo_coordinates: Coordinates;
  description?: string;
};

export function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const matches = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  const values = matches.map(Number).filter(Number.isFinite);
  return values.reduce((sum, number) => sum + number, 0) / values.length;
}

export function rankHotels<T extends HotelCandidate>(
  hotels: T[],
  nightlyBudget: number,
  center?: Coordinates,
): Array<T & { recommendation_score: number }> {
  return hotels
    .map((hotel) => {
      const price = parseMoney(hotel.price_per_night);
      const budgetMatch = nightlyBudget > 0 && price > 0
        ? Math.max(0, 1 - Math.abs(price - nightlyBudget) / nightlyBudget)
        : 0.5;
      const distance = center && isValidCoordinates(center) && isValidCoordinates(hotel.geo_coordinates)
        ? haversineDistanceKm(center, hotel.geo_coordinates)
        : 5;
      const distanceScore = 1 / (1 + distance / 5);
      const ratingScore = Math.min(1, Math.max(0, hotel.rating / 5));
      const amenitySignals = (hotel.description?.match(/pool|wifi|breakfast|transit|family|spa|central/gi) ?? []).length;
      const amenityScore = Math.min(1, amenitySignals / 4);
      const recommendation_score = ratingScore * 0.45 + budgetMatch * 0.3 + distanceScore * 0.2 + amenityScore * 0.05;
      return { ...hotel, recommendation_score: Math.round(recommendation_score * 1000) / 1000 };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);
}

