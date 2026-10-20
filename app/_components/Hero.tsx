"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lock,
  MapPin,
  Plane,
  RotateCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { motion } from "motion/react";

export type HeroCatalogCounts = {
  destinations: number;
  cityGuides: number;
  travelSignals: number;
};
export type Suggestion = {
  title: string;
  icon: React.ReactNode;
};

export const suggestions: Suggestion[] = [
  {
    title: "Weekend getaway to Kyoto temples and tea houses",
    icon: <Sparkles className="size-4 text-teal-600" />,
  },
  {
    title: "7-day budget backpacking across Southern Italy & Amalfi",
    icon: <Plane className="size-4 text-teal-600" />,
  },
  {
    title: "Luxury beach villa retreat in Bali with private wellness tours",
    icon: <MapPin className="size-4 text-teal-600" />,
  },
  {
    title: "Alpine hiking and scenic train journey through Swiss Alps",
    icon: <Compass className="size-4 text-teal-600" />,
  },
];

// Popular destinations featured in the image
const popularDestinations = [
  {
    name: "Santorini",
    region: "Greece",
    slug: "santorini",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Maldives",
    region: "Indian Ocean",
    slug: "maldives",
    image:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Swiss Alps",
    region: "Switzerland",
    slug: "swiss-alps",
    image:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Bali",
    region: "Indonesia",
    slug: "bali",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop&q=80",
  },
];

const Hero = ({ catalogCounts }: { catalogCounts: HeroCatalogCounts }) => {
  const { user } = useUser();
  const router = useRouter();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [activeTab, setActiveTab] = useState<
    "flights" | "hotels" | "experiences"
  >("flights");
  const [dates, setDates] = useState("");
  const [travelers, setTravelers] = useState("2");
  const [hotelType, setHotelType] = useState("Any stay");
  const [experienceType, setExperienceType] = useState("Culture & sightseeing");

  const handleLaunchTrip = () => {
    const query = new URLSearchParams();
    const selectedPlace = destination.trim();
    const details =
      activeTab === "hotels"
        ? ` Include ${hotelType.toLowerCase()} accommodation ideas.`
        : activeTab === "experiences"
          ? ` Prioritize ${experienceType.toLowerCase()} activities.`
          : "";
    const prompt = `Plan a trip itinerary${selectedPlace ? ` for ${selectedPlace}` : ""}${activeTab === "flights" && origin.trim() ? ` starting from ${origin.trim()}` : ""}.${details} Dates: ${dates.trim() || "flexible"}. Travelers: ${travelers.trim() || "not specified"}. Treat prices and venue details as estimates unless verified.`;
    if (selectedPlace) query.set("destination", selectedPlace);
    query.set("idea", prompt);
    query.set("autostart", "1");
    const destUrl = `/create-new-trip?${query.toString()}`;
    router.push(
      user ? destUrl : `/sign-in?redirect_url=${encodeURIComponent(destUrl)}`,
    );
  };

  const handleFlip = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      {/* Full-bleed Tropical Coastal Background (Matching exact image: turquoise bay, karst sea stacks, sunset) */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <Image
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2400&auto=format&fit=crop&q=85"
          alt="Tropical emerald bay background"
          fill
          priority
          sizes="100vw"
          className="object-cover brightness-[0.78] contrast-[1.08] saturate-[1.2]"
        />
        {/* Subtle radial shadow overlay to ensure text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/90 via-[#070b14]/55 to-[#070b14]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-[#070b14]/60" />
      </div>

      {/* Flight Path SVG Line over the water (Image exact visual feature) */}
      <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-full opacity-80"
        >
          {/* Dashed flight trajectory */}
          <path
            d="M 640 540 C 720 620, 800 680, 840 760"
            stroke="#2dd4bf"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
          <path
            d="M 640 540 C 660 480, 710 320, 680 210"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeDasharray="5 5"
            strokeOpacity="0.7"
          />
        </svg>

        {/* Location Pin Marker on the water (Image exact teal marker) */}
        <div className="absolute left-[44%] top-[59%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="relative">
            <span className="absolute -inset-2 rounded-full bg-teal-400/40 animate-ping" />
            <div className="size-6 rounded-full bg-[#2dd4bf] shadow-[0_0_20px_#2dd4bf] flex items-center justify-center border-2 border-white">
              <span className="size-2 rounded-full bg-slate-950" />
            </div>
          </div>
        </div>

        {/* Airplane icon along trajectory heading toward horizon */}
        <div className="absolute left-[47%] top-[24%] -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] text-white/90 drop-shadow">
          <Plane className="size-5 fill-white" />
        </div>
      </div>

      {/* Main Content Area */}
      <section className="relative z-20 mx-auto max-w-[1760px] px-4 pt-32 pb-16 sm:px-6 sm:pt-36 lg:px-10 lg:pt-40 2xl:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_minmax(420px,0.9fr)] xl:gap-20 items-center">
          {/* Left Column: Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl lg:max-w-none"
          >
            {/* Hero eyebrow */}
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">
              <span className="w-8 h-[2px] bg-[#2dd4bf]" />
              <span>THE WORLD IS WAITING</span>
            </div>

            {/* Headline: Adventures That Stay With You (Exact Image Serif Typography) */}
            <h1 className="mt-6 font-display text-5xl sm:text-7xl lg:text-[5.5rem] 2xl:text-[6.5rem] font-bold tracking-tight text-white leading-[1.04]">
              Adventures <br />
              That Stay <br />
              With You
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-200/90 font-light drop-shadow">
              Discover breathtaking destinations, unique experiences and
              unforgettable memories across the globe.
            </p>

            {/* Action Buttons: Mint Green Explore + Circular Play Video */}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/explore-cities"
                className="inline-flex items-center gap-2 rounded-full bg-[#2dd4bf] hover:bg-[#34d399] px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.4)] transition hover:scale-105"
              >
                <span>Explore Destinations</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column: "Where to next?" Spatial Frosted Glass Booking Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="w-full max-w-md mx-auto lg:max-w-none"
          >
            <div className="rounded-3xl border border-white/15 bg-slate-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/70">
              {/* Header */}
              <div>
                <h3 className="font-heading text-2xl font-bold text-white tracking-tight">
                  Start a trip plan
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Personalized itinerary ideas. No live booking search.
                </p>
              </div>

              {/* Trip focus tabs */}
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-1">
                {(
                  [
                    {
                      id: "flights",
                      label: "Trip",
                      icon: <Plane className="size-3.5" />,
                    },
                    {
                      id: "hotels",
                      label: "Stay",
                      icon: <MapPin className="size-3.5" />,
                    },
                    {
                      id: "experiences",
                      label: "Activities",
                      icon: <Sparkles className="size-3.5" />,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                      activeTab === tab.id
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Search fields change with the selected travel category. */}
              <div className="mt-5 relative space-y-3">
                {activeTab === "flights" && (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 focus-within:border-teal-400">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        From
                      </label>
                      <div className="mt-1 flex items-center gap-2.5">
                        <span className="size-2 rounded-full bg-[#2dd4bf]" />
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          placeholder="City or airport (optional)"
                          aria-label="Starting city or airport"
                          className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Flip/Swap Button */}
                    <button
                      type="button"
                      onClick={handleFlip}
                      aria-label="Swap origin and destination"
                      className="absolute right-4 top-[40%] -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-teal-400 shadow-lg hover:rotate-180 transition duration-300"
                    >
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </>
                )}

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 focus-within:border-teal-400">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {activeTab === "flights" ? "To" : "Destination"}
                  </label>
                  <div className="mt-1 flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-[#2dd4bf]" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Bali, Indonesia"
                      aria-label="Destination"
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>
                {activeTab === "hotels" && (
                  <label className="block rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stay type
                    <select
                      value={hotelType}
                      onChange={(event) => setHotelType(event.target.value)}
                      className="mt-1 w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-white outline-none"
                    >
                      <option className="bg-slate-900">Any stay</option>
                      <option className="bg-slate-900">Hotel</option>
                      <option className="bg-slate-900">Resort</option>
                      <option className="bg-slate-900">Apartment</option>
                      <option className="bg-slate-900">Villa</option>
                    </select>
                  </label>
                )}
                {activeTab === "experiences" && (
                  <label className="block rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Experience
                    <select
                      value={experienceType}
                      onChange={(event) =>
                        setExperienceType(event.target.value)
                      }
                      className="mt-1 w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-white outline-none"
                    >
                      <option className="bg-slate-900">
                        Culture &amp; sightseeing
                      </option>
                      <option className="bg-slate-900">
                        Food &amp; local tours
                      </option>
                      <option className="bg-slate-900">
                        Outdoor adventure
                      </option>
                      <option className="bg-slate-900">
                        Wellness &amp; relaxation
                      </option>
                      <option className="bg-slate-900">
                        Family activities
                      </option>
                    </select>
                  </label>
                )}
              </div>

              {/* Dates & Travelers Grid */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dates
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="size-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={dates}
                      onChange={(e) => setDates(e.target.value)}
                      placeholder="Flexible"
                      aria-label="Travel dates"
                      className="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Travelers
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <Users className="size-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      placeholder="e.g. 2"
                      aria-label="Number of travelers"
                      className="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mint Green Search Button (Image exact style) */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleLaunchTrip}
                  disabled={!destination.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2dd4bf] hover:bg-[#34d399] py-4 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(45,212,191,0.4)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Plan This Trip</span>
                  <ArrowRight className="size-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section: Popular Destinations (Left) + Trust Badges (Right) */}
        <div className="mt-16 grid gap-8 lg:grid-cols-[1.25fr_1fr] items-end">
          {/* Popular Destinations Carousel */}
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-4">
                <h4 className="font-heading text-sm font-bold text-white tracking-wide">
                  Popular Destinations
                </h4>
                <Link
                  href="/explore-cities"
                  className="text-xs font-semibold text-[#2dd4bf] hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous destination"
                  className="p-1.5 rounded-full border border-white/15 bg-slate-950/60 text-slate-300 hover:bg-white/15 hover:text-white"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Next destination"
                  className="p-1.5 rounded-full border border-white/15 bg-slate-950/60 text-slate-300 hover:bg-white/15 hover:text-white"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>

            {/* 4 Cards Row: Santorini, Maldives, Swiss Alps, Bali */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popularDestinations.map((dest) => (
                <Link
                  key={dest.slug}
                  href={`/explore-cities/${dest.slug}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 bg-slate-900 shadow-lg transition hover:scale-105"
                >
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                  <div className="absolute bottom-2.5 inset-x-2.5 flex items-end justify-between">
                    <div>
                      <h5 className="font-heading text-xs font-bold text-white group-hover:text-teal-300 transition">
                        {dest.name}
                      </h5>
                      <p className="text-[10px] text-slate-300">
                        {dest.region}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Product capabilities */}
          <div className="rounded-2xl border border-white/15 bg-slate-950/60 backdrop-blur-2xl p-4 shadow-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="flex flex-col items-center">
                <Sparkles className="size-5 text-[#2dd4bf] mb-1.5" />
                <span className="text-[11px] font-bold text-white leading-tight">
                  AI trip planning
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Calendar className="size-5 text-[#2dd4bf] mb-1.5" />
                <span className="text-[11px] font-bold text-white leading-tight">
                  Editable itineraries
                </span>
              </div>
              <div className="flex flex-col items-center">
                <Lock className="size-5 text-[#2dd4bf] mb-1.5" />
                <span className="text-[11px] font-bold text-white leading-tight">
                  Private saved trips
                </span>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="size-5 text-[#2dd4bf] mb-1.5" />
                <span className="text-[11px] font-bold text-white leading-tight">
                  Curated destinations
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Counts from public curated catalogs */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {catalogCounts.destinations}
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Destinations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {catalogCounts.cityGuides}
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-400">
              City guides
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white">
              {catalogCounts.travelSignals}
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Travel signal guides
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
