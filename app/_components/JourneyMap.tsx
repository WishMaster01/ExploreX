"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Database, MapPin, Sparkles } from "lucide-react";
import { DESTINATIONS } from "@/lib/data/destinations";
import { exploreCities } from "@/lib/data/cities";

type Waypoint = {
  id: string;
  name: string;
  country: string;
  slug: string;
  x: number; // percentage from longitude
  y: number; // percentage from latitude
  image: string;
  tagline: string;
  popularity: number;
};

// Map real server destinations with exact geographic coordinates
const realWaypoints: Waypoint[] = [
  "Bali",
  "Dubai",
  "Santorini",
  "Cape Town",
  "Tokyo",
  "Rome",
  "Paris",
  "New York City",
]
  .map((cityName) => {
    const dest = DESTINATIONS.find(
      (d) => d.city.toLowerCase() === cityName.toLowerCase(),
    );
    const city = exploreCities.find(
      (c) => c.name.toLowerCase() === cityName.toLowerCase(),
    );
    if (!dest || !city) return null;

    // Standard equirectangular projection onto 100% canvas
    const x = Math.min(
      94,
      Math.max(6, Math.round(((dest.longitude + 180) / 360) * 100)),
    );
    const y = Math.min(
      88,
      Math.max(12, Math.round(((90 - dest.latitude) / 180) * 100)),
    );

    return {
      id: city.slug,
      name: city.name,
      country: city.country,
      slug: city.slug,
      x,
      y,
      image: city.image,
      tagline: city.tagline,
      popularity: dest.popularity,
    };
  })
  .filter((w): w is Waypoint => w !== null);

export function JourneyMap() {
  const [activeWaypoint, setActiveWaypoint] = useState<Waypoint>(
    realWaypoints[0],
  );
  const [waypoints, setWaypoints] = useState(realWaypoints);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/site-datasets?key=destinations"),
      fetch("/api/city-guides"),
    ])
      .then(async ([destinationResponse, cityResponse]) => {
        if (!destinationResponse.ok || !cityResponse.ok) return null;
        return Promise.all([destinationResponse.json(), cityResponse.json()]);
      })
      .then((results) => {
        if (!results) return;
        const [destinationData, cityData] = results;
        if (
          !Array.isArray(destinationData.content) ||
          !Array.isArray(cityData.cities)
        )
          return;
        const destinationRows = destinationData.content as typeof DESTINATIONS;
        const cityRows = cityData.cities as typeof exploreCities;
        const current: Waypoint[] = destinationRows
          .flatMap((dest) => {
            const city = cityRows.find(
              (item) => item.name.toLowerCase() === dest.city.toLowerCase(),
            );
            if (!city) return [];
            const x = Math.min(
              94,
              Math.max(6, Math.round(((dest.longitude + 180) / 360) * 100)),
            );
            const y = Math.min(
              88,
              Math.max(12, Math.round(((90 - dest.latitude) / 180) * 100)),
            );
            return [
              {
                id: city.slug,
                name: city.name,
                country: city.country,
                slug: city.slug,
                x,
                y,
                image: city.image,
                tagline: city.tagline,
                popularity: dest.popularity,
              },
            ];
          })
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 12);
        if (current.length) {
          setWaypoints(current);
          setActiveWaypoint(current[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#090d16]">
      {/* Real Geographic Data Indicator */}
      <div className="pointer-events-none absolute left-6 top-8 opacity-25 select-none">
        <div className="w-28 h-28 rounded-full border border-teal-500/40 flex items-center justify-center text-[10px] font-mono text-teal-300 uppercase text-center p-2">
          GEOGRAPHIC COORDINATES · SERVER SYNCED
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[340px_1fr] items-center">
          {/* Left Text / Story Header */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300">
              <Compass className="size-3.5" />
              Real Geographic Routing
            </div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Journey Map
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Plotted from exact server coordinates across Europe, Asia, Africa,
              and the Americas. Select any waypoint to view its destination
              dossier.
            </p>

            {/* Selected Waypoint Preview Card */}
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-xl ring-2 ring-teal-400/50">
                  <Image
                    src={activeWaypoint.image}
                    alt={activeWaypoint.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    {activeWaypoint.country}
                  </p>
                  <h4 className="font-heading text-lg font-bold text-white">
                    {activeWaypoint.name}
                  </h4>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                {activeWaypoint.tagline}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/explore-cities/${activeWaypoint.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-500/20 border border-teal-400/40 py-2 text-xs font-bold text-teal-200 hover:bg-teal-500/30"
                >
                  <span>Explore City Guide</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/explore-cities"
                className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 transition"
              >
                Browse all mapped destinations <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Right Visual Map Canvas with Interactive Geocoded Pins */}
          <div className="relative aspect-[16/10] w-full rounded-3xl border border-white/10 bg-[#0c121e] overflow-hidden shadow-2xl">
            {/* Dark Stylized World Map Grid */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Flight Trail Connecting Real Waypoints */}
            <svg
              className="absolute inset-0 size-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="realFlightPath"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M 280 180 Q 490 140, 560 210 T 780 200 T 750 350"
                fill="none"
                stroke="url(#realFlightPath)"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-pulse"
              />
            </svg>

            {/* Interactive Location Pins */}
            {waypoints.map((point) => {
              const isSelected = activeWaypoint.id === point.id;
              return (
                <div
                  key={point.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                  onClick={() => setActiveWaypoint(point)}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Pulsing halo */}
                    {isSelected && (
                      <span className="absolute -inset-2 rounded-full bg-teal-400/25 animate-ping" />
                    )}

                    {/* Circular photo pin */}
                    <div
                      className={`relative size-11 sm:size-12 rounded-full overflow-hidden border-2 transition duration-300 shadow-xl ${
                        isSelected
                          ? "border-teal-400 scale-110 shadow-teal-500/40 ring-4 ring-teal-400/20"
                          : "border-white/50 group-hover:scale-105 group-hover:border-white"
                      }`}
                    >
                      <Image
                        src={point.image}
                        alt={point.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Location Name Tag */}
                    <div className="mt-1.5 rounded-full border border-white/20 bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                      {point.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
