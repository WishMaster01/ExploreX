import Hero from "./_components/Hero";
import { PopularCityList } from "./_components/PopularCityList";
import { DeferredJourneyMap } from "./_components/DeferredJourneyMap";
import { TravelerDiaries } from "./_components/TravelerDiaries";
import { StorytellingFooterBanner } from "./_components/StorytellingFooterBanner";
import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";
import { DESTINATIONS } from "@/lib/data/destinations";
import { exploreCities } from "@/lib/data/cities";
import { travelSignals } from "@/lib/data/travel-signals";

const publicSiteUrl = getPublicSiteUrl()?.toString();

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100 overflow-x-hidden">
      {publicSiteUrl && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "ExploreX",
              url: publicSiteUrl,
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {/* 1. Cinematic Hero with Storytelling Typography & Spatial Booking Copilot (Images 1 & 5) */}
      <Hero
        catalogCounts={{
          destinations: DESTINATIONS.length,
          cityGuides: exploreCities.length,
          travelSignals: travelSignals.length,
        }}
      />

      {/* 2. Interactive 3D Coverflow City Carousel (Image 3) */}
      <PopularCityList />

      {/* 3. Vintage Journey Map with Connecting Flight Paths & Pins (Image 1) */}
      <DeferredJourneyMap />

      {/* 4. Traveler Diaries with Polaroid Taped Cards & Quotes (Image 1) */}
      <TravelerDiaries />

      {/* 5. "The World is Waiting" Banner, Gold Travel Categories & Trust Badges (Images 1 & 5) */}
      <StorytellingFooterBanner />
    </main>
  );
}
