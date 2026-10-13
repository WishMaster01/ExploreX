"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { CityCoverflowCarousel } from "@/components/ui/city-coverflow-carousel";

export function PopularCityList() {
  return (
    <section
      id="explore"
      className="relative w-full overflow-hidden py-24 bg-[#080c16] text-white border-t border-white/10"
    >
      {/* Background ambient light */}
      <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 w-[700px] h-[350px] bg-teal-500/10 rounded-full blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-300">
          <Sparkles className="size-3.5" />
          Spatial City Showcase
        </div>

        <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
          Explore Iconic Cities in{" "}
          <span className="gradient-text">3D Perspective.</span>
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
          Swipe, rotate, and discover curated intelligence for Rome, Saint
          Petersburg, Santorini, Bali, Paris, and beyond.
        </p>

        {/* 3D Coverflow Carousel (Image 3) */}
        <div className="mt-6">
          <CityCoverflowCarousel />
        </div>

        <div className="mt-12">
          <Link
            href="/explore-cities"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white/15 hover:border-teal-400"
          >
            <span>Browse All City Guides</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
