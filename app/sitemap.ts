import type { MetadataRoute } from "next";
import { travelSignals } from "@/lib/data/travel-signals";
import {
  exploreCategories,
  getJaipurCategoryPlaces,
} from "@/lib/data/india-explore";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return [];

  const publicRoutes = [
    "/",
    "/explore-india",
    "/ai-features",
    "/uncovered",
    "/explore-india/destinations/jaipur-in",
  ];
  return [
    ...publicRoutes.map((route) => ({
      url: new URL(route, siteUrl).toString(),
    })),
    ...exploreCategories
      .filter((category) => getJaipurCategoryPlaces(category).length > 0)
      .map((category) => ({
        url: new URL(
          `/explore-india/categories/${encodeURIComponent(category.id)}`,
          siteUrl,
        ).toString(),
      })),
    ...travelSignals.map((signal) => ({
      url: new URL(
        `/travel-signals/${encodeURIComponent(signal.slug)}`,
        siteUrl,
      ).toString(),
    })),
  ];
}
