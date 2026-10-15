import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore-cities", "/ai-features", "/travel-signals/"],
      disallow: [
        "/admin",
        "/create-new-trip",
        "/saved-trips",
        "/saved-cities",
        "/api/",
      ],
    },
    ...(siteUrl
      ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() }
      : {}),
  };
}
