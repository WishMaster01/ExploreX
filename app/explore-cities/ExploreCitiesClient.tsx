"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Search,
  Sparkles,
  Wallet2,
  CloudSun,
} from "lucide-react";
import { exploreCities, type ExploreCity } from "@/lib/data/cities";

export function ExploreCitiesClient({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [search, setSearch] = useState(initialQuery);
  const [cities, setCities] = useState(exploreCities);

  useEffect(() => {
    fetch("/api/city-guides")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.cities)) setCities(data.cities);
      })
      .catch(() => {});
  }, []);

  const regions = [
    "All",
    "Europe",
    "Asia",
    "Americas",
    "Middle East",
    "Africa",
    "Oceania",
  ];

  const filtered = cities.filter((city) => {
    const matchesRegion =
      selectedRegion === "All" || city.region === selectedRegion;
    const matchesSearch =
      search === "" ||
      city.name.toLowerCase().includes(search.toLowerCase()) ||
      city.country.toLowerCase().includes(search.toLowerCase()) ||
      city.tagline.toLowerCase().includes(search.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-white pt-28 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-300">
            <Compass className="size-3.5" />
            Destination Intelligence
          </div>

          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            Curated City Guides for{" "}
            <span className="gradient-text">Intelligent Travelers.</span>
          </h1>

          <p className="mt-4 text-base text-slate-300">
            Every destination is loaded with daily budgets, top attractions,
            seasons, transit, and local culture structured for seamless
            itinerary planning.
          </p>
        </div>

        {/* Filter Controls (Region tabs & Search pill) */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-2xl shadow-xl">
          {/* Region Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {regions.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setSelectedRegion(region)}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition ${
                  selectedRegion === region
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Search Pill */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 w-full md:w-72 shadow-inner">
            <Search className="size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or country..."
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* City Grid */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((city) => (
            <Link
              key={city.slug}
              href={`/explore-cities/${city.slug}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-teal-400/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={city.image}
                    alt={`${city.name}, ${city.country}`}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Weather Tag */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    <CloudSun className="size-3.5 text-amber-400" />
                    <span>{city.weather.temp}</span>
                  </div>

                  {/* City & Country */}
                  <div className="absolute bottom-4 left-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      {city.flag} {city.country}
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                      {city.name}
                    </h2>
                  </div>
                </div>

                <div className="p-6">
                  <p className="min-h-12 text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-2">
                    {city.tagline}
                  </p>

                  <div className="mt-5 grid gap-2.5 border-t border-white/10 pt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Wallet2 className="size-4 text-amber-400 shrink-0" />
                      <span className="text-white font-medium">
                        {city.estimatedDailyCost}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-teal-400 shrink-0" />
                      <span>{city.idealDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-sky-400 shrink-0" />
                      <span>{city.places.length} curated destinations</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-wider text-teal-300 group-hover:text-teal-200">
                  <span>View Spatial Guide</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
