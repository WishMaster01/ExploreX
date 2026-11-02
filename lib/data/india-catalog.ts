import rawDestination from "../../data/destinations/jaipur.json";
import rawPlaces from "../../data/places/jaipur.json";
import rawRestaurants from "../../data/restaurants/jaipur.json";
import rawHotels from "../../data/hotels/jaipur.json";
import rawExperiences from "../../data/experiences/jaipur.json";
import rawGuide from "../../data/travel-guides/jaipur.json";
import rawTaxonomy from "../../data/catalogs/travel-taxonomy.json";
import {
  jaipurCatalogSchema,
  taxonomySchema,
  unknownCategoryReferences,
} from "@/lib/domain/dataset-schemas";
import { flattenTravelTaxonomy } from "@/lib/domain/travel-data-schemas";

const taxonomyResult = taxonomySchema.safeParse(
  flattenTravelTaxonomy(rawTaxonomy),
);
if (!taxonomyResult.success) {
  throw new Error("The checked-in travel taxonomy is invalid.");
}

const catalogResult = jaipurCatalogSchema.safeParse({
  destination: rawDestination,
  places: rawPlaces,
  restaurants: rawRestaurants,
  hotels: rawHotels,
  experiences: rawExperiences,
  travelGuide: rawGuide,
});
if (!catalogResult.success) {
  throw new Error("The checked-in Jaipur catalog is invalid.");
}

const unknownCategories = unknownCategoryReferences(
  catalogResult.data,
  taxonomyResult.data,
);
if (unknownCategories.length) {
  throw new Error(
    `Unknown Jaipur taxonomy categories: ${unknownCategories.join(", ")}`,
  );
}

export const indiaTaxonomy = taxonomyResult.data;
export const jaipurCatalog = catalogResult.data;
