"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Footprints,
  HeartHandshake,
  Landmark,
  ShieldCheck,
  Sparkles,
  TreePine,
  Utensils,
  Headphones,
  CalendarCheck,
  Lock,
} from "lucide-react";

export function StorytellingFooterBanner() {
  const categories = [
    {
      name: "Adventure",
      tagline: "Seek the thrill",
      icon: <Compass className="size-6 text-amber-400" />,
      query: "adventure",
    },
    {
      name: "Culture",
      tagline: "Embrace the world",
      icon: <Landmark className="size-6 text-amber-400" />,
      query: "culture",
    },
    {
      name: "Nature",
      tagline: "Find your calm",
      icon: <TreePine className="size-6 text-amber-400" />,
      query: "nature",
    },
    {
      name: "Food",
      tagline: "Taste the stories",
      icon: <Utensils className="size-6 text-amber-400" />,
      query: "culinary",
    },
    {
      name: "People",
      tagline: "Connect deeply",
      icon: <HeartHandshake className="size-6 text-amber-400" />,
      query: "community",
    },
  ];

  const trustBadges = [
    {
      title: "Best Price Guarantee",
      desc: "Transparent estimates & no hidden surcharges",
      icon: <ShieldCheck className="size-5 text-teal-400" />,
    },
    {
      title: "24/7 AI Copilot Support",
      desc: "Instant live guidance anywhere you land",
      icon: <Headphones className="size-5 text-teal-400" />,
    },
    {
      title: "Flexible Bookings",
      desc: "Dynamic itinerary adjustments on the fly",
      icon: <CalendarCheck className="size-5 text-teal-400" />,
    },
    {
      title: "Secure Planning",
      desc: "Privacy-first architecture & verified credentials",
      icon: <Lock className="size-5 text-teal-400" />,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#070a12] text-white">
      {/* Visual Panorama Banner (Image 1 style traveler overlooking sunrise mountains) */}
      <div className="relative min-h-[460px] flex items-center justify-center overflow-hidden px-4 py-24 sm:px-6 lg:px-8 border-t border-white/10">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1800&auto=format&fit=crop&q=80"
          alt="The World is Waiting"
          fill
          priority
          className="object-cover opacity-35 filter brightness-75 select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-[#070a12]/70 to-[#070a12]/40" />

        <div className="relative z-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-300" />
            Adventures That Stay With You
          </div>

          <h2 className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-md">
            The World is{" "}
            <span className="font-handwriting text-amber-400 italic">
              Waiting.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-slate-200 drop-shadow">
            Pack your bag, open your heart, and let&apos;s create stories for a
            lifetime. Your personalized itinerary is one click away.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create-new-trip"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_30px_rgba(249,115,22,0.4)] transition hover:scale-105 hover:shadow-[0_0_45px_rgba(249,115,22,0.6)]"
            >
              <span>Plan Your Journey</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/explore-cities"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-md hover:bg-white/10"
            >
              Browse All Cities
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Luxury Gold Etched Travel Categories (Image 1 style) */}
      <div className="border-y border-white/10 bg-[#090e1a]/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/explore-cities?category=${cat.query}`}
              className="group flex flex-col items-center p-3 rounded-2xl transition hover:bg-white/5"
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 transition group-hover:scale-110 group-hover:border-amber-400 group-hover:bg-amber-500/20 shadow-lg shadow-amber-500/10">
                {cat.icon}
              </div>
              <p className="font-heading text-sm font-bold uppercase tracking-wider text-white group-hover:text-amber-300 transition">
                {cat.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{cat.tagline}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Trust Badges Ribbon (Image 5 style) */}
      <div className="py-10 px-4 sm:px-6 lg:px-8 bg-[#070a12]">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trustBadges.map((badge) => (
            <div
              key={badge.title}
              className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-lg"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
                {badge.icon}
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-white">
                  {badge.title}
                </h4>
                <p className="text-xs text-slate-400 leading-snug">
                  {badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
