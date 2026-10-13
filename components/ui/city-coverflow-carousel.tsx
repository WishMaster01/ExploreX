"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  MoreHorizontal,
  MapPin,
  Compass,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Lock,
  Search,
  Share2,
} from "lucide-react";
import { exploreCities, type ExploreCity } from "@/lib/data/cities";

interface CityCoverflowCarouselProps {
  onSelectCity?: (city: ExploreCity) => void;
}

export function CityCoverflowCarousel({
  onSelectCity,
}: CityCoverflowCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(1); // Start at Rome or Saint Petersburg
  const [likedCities, setLikedCities] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const [cities, setCities] = useState(exploreCities);
  const currentCity = cities[activeIndex] || cities[0];

  useEffect(() => {
    fetch("/api/city-guides")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.cities) && data.cities.length)
          setCities(data.cities);
      })
      .catch(() => {});
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : cities.length - 1));
  }, [cities.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < cities.length - 1 ? prev + 1 : 0));
  }, [cities.length]);

  const toggleLike = (slug: string) => {
    setLikedCities((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  return (
    <div className="relative w-full max-w-6xl mx-auto py-10 px-4 select-none">
      {/* Top VisionOS / Safari Spatial Browser Header (as in Image 3) */}
      <div className="mx-auto mb-8 max-w-xl flex items-center justify-between rounded-full border border-white/15 bg-slate-900/60 px-4 py-2 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="grid grid-cols-2 gap-0.5 p-1 rounded hover:bg-white/10 cursor-pointer">
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span className="size-1.5 rounded-full bg-slate-400" />
          </div>
          <button
            onClick={handlePrev}
            aria-label="Previous city"
            className="p-1 rounded-full hover:bg-white/10 text-slate-300"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next city"
            className="p-1 rounded-full hover:bg-white/10 text-slate-300"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Central Spatial Search Pill */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-1 text-xs text-slate-300 shadow-inner">
          <Lock className="size-3 text-teal-400" />
          <span className="font-medium tracking-wide">
            {currentCity.name} Explorer
          </span>
          <span className="text-[10px] text-slate-500">
            · {currentCity.country}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Share2 className="size-4 hover:text-slate-200 cursor-pointer" />
          <Link
            href={`/explore-cities/${currentCity.slug}`}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            Open <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {/* 3D Perspective Stage */}
      <div className="relative min-h-[540px] md:min-h-[580px] flex items-center justify-center overflow-hidden py-6 [perspective:1400px]">
        {/* Ambient glow behind active card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
          {cities.map((city, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;
            const isVisible = Math.abs(offset) <= 3;

            if (!isVisible) return null;

            // Compute 3D translation & rotation values
            const xOffset = offset * 180; // card spacing
            const zOffset = -Math.abs(offset) * 120; // depth
            const rotationY = offset * -28; // 3D coverflow angle
            const opacity = Math.max(0.2, 1 - Math.abs(offset) * 0.28);
            const scale = isActive ? 1.04 : 0.86;

            return (
              <motion.div
                key={city.slug}
                onClick={() => {
                  if (!isActive) setActiveIndex(index);
                }}
                animate={{
                  x: xOffset,
                  z: zOffset,
                  rotateY: rotationY,
                  scale,
                  opacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 28,
                }}
                style={{
                  zIndex: 20 - Math.abs(offset),
                  transformStyle: "preserve-3d",
                }}
                className={`absolute w-[290px] sm:w-[340px] md:w-[380px] h-[480px] md:h-[520px] rounded-3xl overflow-hidden cursor-pointer ${
                  isActive
                    ? "ring-1 ring-white/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(251,191,36,0.18)]"
                    : "ring-1 ring-white/10 shadow-2xl filter brightness-75 hover:brightness-90"
                }`}
              >
                {/* Background City Image */}
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  sizes="(max-width: 768px) 300px, 400px"
                  className="object-cover transition duration-700 select-none"
                  priority={isActive}
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20" />

                {/* Top Action Pills (Image 3 exact style) */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
                  <Link
                    href={`/explore-cities/${city.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/20"
                  >
                    <Maximize2 className="size-3 text-teal-400" />
                    <span>Explore City</span>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-white/15 bg-slate-950/60 px-2.5 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-xl">
                      {city.flag} {city.region}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(city.slug);
                      }}
                      className="p-1.5 rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-xl hover:bg-white/20"
                    >
                      <Heart
                        className={`size-3.5 ${
                          likedCities[city.slug]
                            ? "fill-rose-500 text-rose-500"
                            : "text-white"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Card Bottom Meta (Image 3 style) */}
                <div className="absolute bottom-0 inset-x-0 p-5 md:p-6 text-white z-20 flex flex-col justify-end bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                        {city.country}
                      </p>
                      <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
                        {city.name}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {index + 1} / {cities.length}
                    </span>
                  </div>

                  <p className="mt-2 text-xs md:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                    {city.tagline}
                  </p>

                  {/* Address & Coordinates */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 text-slate-300 truncate">
                      <MapPin className="size-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {city.featuredLandmark.name}
                      </span>
                    </div>
                    {city.coordinates && (
                      <span className="text-[10px] text-slate-500 font-mono pl-5">
                        {city.coordinates}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-4 flex items-center gap-2">
                      <Link
                        href={`/explore-cities/${city.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-sky-400"
                      >
                        <span>View Full Guide</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                      <Link
                        href={`/create-new-trip?destination=${encodeURIComponent(
                          `${city.name}, ${city.country}`,
                        )}&autostart=1`}
                        className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur hover:bg-white/20"
                      >
                        Plan
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Spatial Bottom Navigation Dock (Exact Image 3 style) */}
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-slate-900/80 px-4 py-2 backdrop-blur-2xl shadow-2xl">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous city"
            className="flex size-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            <ChevronLeft className="size-5" />
          </button>

          <Link
            href={`/explore-cities/${currentCity.slug}`}
            className="group flex items-center gap-3 px-2 py-1 transition hover:opacity-90"
          >
            <div className="relative size-10 overflow-hidden rounded-full ring-2 ring-teal-400/50">
              <Image
                src={currentCity.image}
                alt={currentCity.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white group-hover:text-teal-300 transition">
                {currentCity.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {currentCity.tagline.slice(0, 32)}...
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => toggleLike(currentCity.slug)}
            aria-label="Favorite city"
            className="flex size-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-rose-400"
          >
            <Heart
              className={`size-4 ${
                likedCities[currentCity.slug]
                  ? "fill-rose-500 text-rose-500"
                  : "text-slate-300"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next city"
            className="flex size-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center gap-1.5">
          {cities.map((city, idx) => (
            <button
              key={city.slug}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to ${city.name}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "w-6 bg-teal-400"
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
