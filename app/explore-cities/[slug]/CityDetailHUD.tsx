"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  CloudSun,
  Compass,
  ExternalLink,
  Heart,
  Home,
  Info,
  Languages,
  MapPin,
  Navigation,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  Train,
  Utensils,
  Wallet2,
} from "lucide-react";
import { type ExploreCity, type CityPlace } from "@/lib/data/cities";

export function CityDetailHUD({ city }: { city: ExploreCity }) {
  const [selectedPlace, setSelectedPlace] = useState<CityPlace>(city.places[0]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkedPlaces, setBookmarkedPlaces] = useState<
    Record<string, boolean>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [liveWeather, setLiveWeather] = useState<{
    temp: string;
    condition: string;
    source: string;
  } | null>(null);
  const [saveNotice, setSaveNotice] = useState("");

  React.useEffect(() => {
    fetch("/api/saved-cities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.savedCities)) {
          setIsBookmarked(
            data.savedCities.some(
              (saved: { slug?: string }) => saved.slug === city.slug,
            ),
          );
        }
      })
      .catch(() => {});
    fetch(`/api/weather?city=${encodeURIComponent(city.name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.temp) {
          setLiveWeather({
            temp: data.temp,
            condition: data.condition,
            source: data.source,
          });
        }
      })
      .catch(() => {});
  }, [city.name, city.slug]);

  const filteredPlaces = city.places.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const togglePlaceBookmark = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedPlaces((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCityBookmark = async () => {
    const response = await fetch(
      isBookmarked
        ? `/api/saved-cities?slug=${encodeURIComponent(city.slug)}`
        : "/api/saved-cities",
      {
        method: isBookmarked ? "DELETE" : "POST",
        ...(isBookmarked
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: city.slug }),
            }),
      },
    );
    if (response.status === 401) {
      setSaveNotice("Sign in to keep this city in your saved collection.");
      return;
    }
    if (!response.ok) {
      setSaveNotice("Could not update your saved cities. Please try again.");
      return;
    }
    setIsBookmarked(!isBookmarked);
    setSaveNotice(
      isBookmarked
        ? "Removed from your saved cities."
        : "Added to your saved cities.",
    );
  };

  const getActionIcon = (action?: string) => {
    switch (action) {
      case "camera":
        return <Camera className="size-4" />;
      case "shop":
        return <ShoppingBag className="size-4" />;
      case "ticket":
        return <Ticket className="size-4" />;
      case "landmark":
        return <Compass className="size-4" />;
      default:
        return <Bookmark className="size-4" />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b14] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Atmosphere */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <Image
          src={city.image}
          alt={city.name}
          fill
          priority
          className="object-cover opacity-15 filter blur-2xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b14]/90 via-[#070b14]/95 to-[#070b14]" />
      </div>

      <div className="relative mx-auto max-w-[1440px]">
        {/* Top Spatial VisionOS Navigation Bar (Image 2 exact style) */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/15 bg-slate-900/70 p-3.5 backdrop-blur-2xl shadow-2xl">
          {/* Left: City Explorer Title & Back button */}
          <div className="flex items-center gap-3">
            <Link
              href="/explore-cities"
              className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="relative size-9 overflow-hidden rounded-xl ring-1 ring-white/20">
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="font-heading text-sm font-bold text-white tracking-wide">
                  {city.name} Explorer
                </h2>
                <span className="text-[10px] text-slate-400">
                  {city.flag} {city.country} · {city.region}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Floating Spatial Search Bar */}
          <div className="flex flex-1 max-w-md items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 shadow-inner">
            <Search className="size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${city.name} attractions, landmarks...`}
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Right: Quick Spatial Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleCityBookmark()}
              aria-label="Wishlist city"
              className={`flex size-10 items-center justify-center rounded-2xl border border-white/10 transition backdrop-blur-xl ${
                isBookmarked
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  : "bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
              }`}
            >
              <Heart
                className={`size-4 ${isBookmarked ? "fill-rose-500" : ""}`}
              />
            </button>

            <Link
              href={`/create-new-trip?destination=${encodeURIComponent(
                `${city.name}, ${city.country}`,
              )}&autostart=1`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-teal-500/25 transition hover:brightness-110"
            >
              <Sparkles className="size-3.5" />
              <span>Plan Trip</span>
            </Link>
          </div>
        </div>
        {saveNotice && (
          <p role="status" className="mb-4 text-right text-xs text-teal-200">
            {saveNotice}
          </p>
        )}

        {/* Spatial Grid: Floating Left Rail + 2-Column HUD (Image 2 style) */}
        <div className="grid gap-6 lg:grid-cols-[72px_1fr]">
          {/* Floating Left Navigation Rail (Image 2 exact style) */}
          <aside className="hidden lg:flex flex-col items-center justify-between rounded-3xl border border-white/15 bg-slate-900/70 py-6 backdrop-blur-2xl shadow-xl min-h-[580px]">
            <div className="flex flex-col items-center gap-6">
              <Link
                href="/"
                title="Home"
                className="flex size-11 items-center justify-center rounded-2xl border border-teal-500/40 bg-teal-500/20 text-teal-300 shadow-md transition hover:scale-105"
              >
                <Home className="size-5" />
              </Link>
              <a
                href="#places"
                title="Destinations"
                className="flex size-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Compass className="size-5" />
              </a>
              <a
                href="#food"
                title="Food & Culture"
                className="flex size-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Utensils className="size-5" />
              </a>
              <a
                href="#activities"
                title="Things to do"
                className="flex size-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Sparkles className="size-5" />
              </a>
              <a
                href="#practical"
                title="Safety & Transit"
                className="flex size-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Ticket className="size-5" />
              </a>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Link
                href="/ai-features"
                title="AI Travel Features"
                className="flex size-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/10 hover:text-teal-300"
              >
                <Sparkles className="size-5" />
              </Link>
            </div>
          </aside>

          {/* Main 2-Column VisionOS HUD (Image 2 Layout) */}
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            {/* 1. Left Featured Showcase Card (Image 2 exact layout) */}
            <div className="relative min-h-[540px] md:min-h-[620px] rounded-3xl overflow-hidden border border-white/15 bg-slate-950/70 p-6 md:p-8 backdrop-blur-2xl shadow-2xl flex flex-col justify-between">
              {/* Background Backdrop Image */}
              <Image
                src={selectedPlace.image || city.image}
                alt={selectedPlace.name}
                fill
                priority
                className="object-cover transition-all duration-700 brightness-75 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/30" />

              {/* Top Details (City Name, Flag, Synopsis, Weather Pill) */}
              <div className="relative z-10 max-w-lg">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-md">
                    {city.name}
                  </h1>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-200">
                    {city.country} {city.flag}
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-light drop-shadow line-clamp-4">
                  {city.tagline} {city.summary}
                </p>

                {/* Weather Pill (Image 2 exact pill with live API feed) */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl shadow-lg">
                  <CloudSun className="size-4 text-amber-400" />
                  <span>
                    {liveWeather
                      ? `${liveWeather.temp} ${liveWeather.condition}`
                      : `${city.weather.temp} ${city.weather.condition}`}
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono pl-1">
                    {liveWeather ? "· Live Weather" : "· Regional Average"}
                  </span>
                </div>
              </div>

              {/* Bottom Floating Bar: Featured Landmark with Heart & Nav Arrow (Image 2 style) */}
              <div className="relative z-10 mt-8 rounded-2xl border border-white/20 bg-slate-900/80 p-4 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 truncate">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-400">
                    <MapPin className="size-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-heading text-sm font-bold text-white truncate">
                      {selectedPlace.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {selectedPlace.address || city.featuredLandmark.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => togglePlaceBookmark(selectedPlace.name, e)}
                    className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-rose-400"
                  >
                    <Heart
                      className={`size-4 ${
                        bookmarkedPlaces[selectedPlace.name]
                          ? "fill-rose-500 text-rose-500"
                          : ""
                      }`}
                    />
                  </button>

                  <Link
                    href={`/create-new-trip?destination=${encodeURIComponent(
                      `${selectedPlace.name}, ${city.name}`,
                    )}&autostart=1`}
                    title="Plan route to this attraction"
                    className="flex size-10 items-center justify-center rounded-xl bg-teal-500 text-slate-950 transition hover:bg-teal-400 shadow-md shadow-teal-500/30"
                  >
                    <Navigation className="size-4 fill-current" />
                  </Link>
                </div>
              </div>
            </div>

            {/* 2. Right Panel: "Must-See Destinations" (Image 2 exact card list) */}
            <div className="rounded-3xl border border-white/15 bg-slate-900/70 p-6 backdrop-blur-2xl shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="font-heading text-lg font-bold text-white tracking-wide">
                    Must-See Destinations
                  </h3>
                  <a
                    href="#places"
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    View all ({city.places.length}){" "}
                    <ArrowRight className="size-3" />
                  </a>
                </div>

                {/* Vertical Stack of Sleek Frosted Destination Cards (Image 2) */}
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredPlaces.map((place) => {
                    const isSelected = selectedPlace.name === place.name;
                    return (
                      <div
                        key={place.name}
                        onClick={() => setSelectedPlace(place)}
                        className={`group cursor-pointer rounded-2xl border p-3 transition duration-200 flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-teal-400/50 bg-teal-500/15 shadow-lg shadow-teal-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 truncate">
                          {/* Thumbnail */}
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15">
                            <Image
                              src={place.image || city.image}
                              alt={place.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div className="truncate">
                            <h4 className="font-heading text-sm font-bold text-white group-hover:text-teal-300 transition truncate">
                              {place.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {place.category}
                            </p>
                            <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 truncate">
                              <MapPin className="size-3 text-amber-400 shrink-0" />
                              <span className="truncate">
                                {place.address || city.name}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Right Action Tag Button (Image 2 style) */}
                        <button
                          type="button"
                          onClick={(e) => togglePlaceBookmark(place.name, e)}
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 transition ${
                            bookmarkedPlaces[place.name]
                              ? "bg-teal-500/30 text-teal-300 border-teal-400/40"
                              : "bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {getActionIcon(place.actionIcon)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Estimated daily cost:{" "}
                  <strong className="text-white">
                    {city.estimatedDailyCost}
                  </strong>
                </span>
                <Link
                  href={`/create-new-trip?destination=${encodeURIComponent(
                    `${city.name}, ${city.country}`,
                  )}&autostart=1`}
                  className="rounded-xl bg-teal-500/20 border border-teal-400/40 px-3.5 py-1.5 text-xs font-bold text-teal-300 hover:bg-teal-500/30"
                >
                  Start Itinerary
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Fact Pills Bar */}
        <div className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            icon={<Wallet2 />}
            label="Daily estimate"
            value={city.estimatedDailyCost}
          />
          <Fact
            icon={<CalendarDays />}
            label="Ideal stay"
            value={city.idealDuration}
          />
          <Fact icon={<Languages />} label="Language" value={city.language} />
          <Fact
            icon={<Train />}
            label="Getting around"
            value={city.localTransit}
          />
        </div>

        {/* Extended Section: Detailed Places Showcase */}
        <section id="places" className="mt-16 scroll-mt-28">
          <div className="flex items-center justify-between pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
                Detailed Guide
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold text-white">
                Places to Visit in {city.name}
              </h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {city.places.map((place) => (
              <div
                key={place.name}
                className="group rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-xl shadow-lg transition hover:border-teal-400/40 hover:-translate-y-1"
              >
                {place.image && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={place.image}
                      alt={place.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-white/15">
                      {place.category}
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-heading text-xl font-bold text-white">
                    {place.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 min-h-[3rem]">
                    {place.description}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                    <div className="rounded-xl bg-white/5 p-2">
                      <span className="block text-[10px] uppercase text-slate-400">
                        Cost
                      </span>
                      <strong className="text-xs text-amber-300">
                        {place.estimatedCost}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <span className="block text-[10px] uppercase text-slate-400">
                        Visit
                      </span>
                      <strong className="text-xs text-slate-200">
                        {place.visitTime}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2">
                      <span className="block text-[10px] uppercase text-slate-400">
                        Best
                      </span>
                      <strong className="text-xs text-slate-200">
                        {place.bestTime}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="activities" className="mt-16 scroll-mt-28">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
            Make it yours
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Things to do in {city.name}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              city.activities ??
              city.places.map((place) => `Explore ${place.name}`)
            ).map((activity) => (
              <div
                key={activity}
                className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm leading-6 text-slate-200"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" />
                {activity}
              </div>
            ))}
          </div>
        </section>

        {/* Food & Culture, Safety & Tips */}
        <div id="food" className="mt-16 grid scroll-mt-28 gap-8 lg:grid-cols-2">
          {/* Food Highlights */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Utensils className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Local Flavors & Food Culture
                </h3>
                <p className="text-xs text-slate-400">
                  Authentic regional dining
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {city.foodHighlights.map((food) => (
                <li
                  key={food}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3.5 text-xs text-slate-200"
                >
                  <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                  <span>{food}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Practical Tips & Safety */}
          <div
            id="practical"
            className="scroll-mt-28 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Safety & Practical Guidance
                </h3>
                <p className="text-xs text-slate-400">{city.bestSeason}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
              <p className="font-semibold">{city.safetyNote}</p>
            </div>
            <ul className="mt-4 space-y-3">
              {(city.safetySteps ?? city.travelTips).map((tip) => (
                <li
                  key={tip}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3.5 text-xs text-slate-200"
                >
                  <Clock3 className="size-4 text-teal-400 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/5 p-3.5">
      <span className="text-teal-400 [&>svg]:size-5">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
