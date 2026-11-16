import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/explore-india",
        "/ai-features",
        "/travel-signals/",
        "/uncovered",
      ],
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
