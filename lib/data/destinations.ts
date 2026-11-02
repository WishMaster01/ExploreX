import rawDestinationCatalog from "../../data/catalogs/destinations.json" with { type: "json" };
import { travelDestinationCatalogSchema } from "../domain/travel-data-schemas.ts";

export type Destination = {
  id: string;
  label: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  destinationType: string;
  aliases: string[];
  latitude?: number;
  longitude?: number;
  popularity: number;
};

const parsedCatalog = travelDestinationCatalogSchema.safeParse(
  rawDestinationCatalog,
);
if (!parsedCatalog.success) {
  throw new Error("The canonical ExploreX destination catalog is invalid.");
}

/** Backward-compatible planner/search projection of the canonical destination catalog. */
export const DESTINATIONS: Destination[] = parsedCatalog.data.destinations.map(
  (destination) => ({
    id: destination.id,
    label: destination.label,
    city: destination.city ?? destination.name,
    ...(destination.state ? { state: destination.state } : {}),
    country: destination.country,
    countryCode: destination.countryCode,
    destinationType: destination.destinationType,
    aliases: destination.aliases,
    ...(destination.coordinates
      ? {
          latitude: destination.coordinates.latitude,
          longitude: destination.coordinates.longitude,
        }
      : {}),
    popularity: destination.popularity,
  }),
);
