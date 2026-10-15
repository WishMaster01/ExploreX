import type { MetadataRoute } from "next";
import { exploreCities } from "@/lib/data/cities";
import { travelSignals } from "@/lib/data/travel-signals";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return [];

  const publicRoutes = ["/", "/explore-cities", "/ai-features"];
  return [
    ...publicRoutes.map((route) => ({
      url: new URL(route, siteUrl).toString(),
    })),
    ...exploreCities.map((city) => ({
      url: new URL(
        `/explore-cities/${encodeURIComponent(city.slug)}`,
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
