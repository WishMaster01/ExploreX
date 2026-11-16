import rawTaxonomy from "../../data/catalogs/travel-taxonomy.json";
import rawPlaces from "../../data/destinations/jaipur-in/places.json";
import rawDestination from "../../data/destinations/jaipur-in/destination.json";
import {
  travelDestinationSchema,
  travelPlaceSchema,
  travelTaxonomySchema,
} from "@/lib/domain/travel-data-schemas";

export type ExploreCategory = {
  id: string;
  name: string;
  description: string;
  matchingCategoryIds: string[];
};

export const exploreTaxonomy = travelTaxonomySchema.parse(rawTaxonomy);
const jaipurPlaces = travelPlaceSchema.array().parse(rawPlaces);
const jaipurDestination = travelDestinationSchema.parse(rawDestination);

const categoryIndex: ExploreCategory[] = exploreTaxonomy.categories.map(
  (item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    matchingCategoryIds: [
      item.id,
      ...(item.subcategories ?? []).map(({ id }) => id),
      ...(item.tags ?? []),
    ],
  }),
);

const tagIndex: ExploreCategory[] = exploreTaxonomy.tags.map((item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  matchingCategoryIds: [item.id],
}));

export const exploreCategories = [...categoryIndex, ...tagIndex];

export function findExploreCategory(id: string) {
  return exploreCategories.find((category) => category.id === id) ?? null;
}

export function getJaipurCategoryPlaces(category: ExploreCategory) {
  return jaipurPlaces.filter((place) =>
    place.categoryIds.some((id) => category.matchingCategoryIds.includes(id)),
  );
}

export function hasJaipurCategory(category: ExploreCategory) {
  return jaipurDestination.categoryIds.some((id) =>
    category.matchingCategoryIds.includes(id),
  );
}
