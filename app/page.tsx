import Hero from "./_components/Hero";
import { PopularCityList } from "./_components/PopularCityList";
import { DeferredJourneyMap } from "./_components/DeferredJourneyMap";
import { TravelerDiaries } from "./_components/TravelerDiaries";
import { StorytellingFooterBanner } from "./_components/StorytellingFooterBanner";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100 overflow-x-hidden">
      {/* 1. Cinematic Hero with Storytelling Typography & Spatial Booking Copilot (Images 1 & 5) */}
      <Hero />

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
