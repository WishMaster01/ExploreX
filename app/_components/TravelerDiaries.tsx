"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Database,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";

type Story = {
  id: string;
  location: string;
  origin?: string | null;
  duration: string;
  budget: string;
  date: string;
  author: string;
  avatar: string;
  image: string;
  summary: string;
  source: string;
};

export function TravelerDiaries() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stories")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.stories) {
          setStories(json.stories);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-[#070a12] border-t border-white/10">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
              <BookOpen className="size-3.5" />
              Community & Server Intel
            </div>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Traveler Diaries & Itineraries
            </h2>
            <p className="mt-3 max-w-xl text-base text-slate-300">
              Real itineraries logged in the ExploreX database and destination
              intelligence guides.
            </p>
          </div>

          <Link
            href="/saved-trips"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition"
          >
            Explore Saved Itineraries <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Polaroid / Traveler Diary Cards */}
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story, index) => {
            const rotations = ["-rotate-1", "rotate-2", "-rotate-2"];
            const rot = rotations[index % rotations.length];

            return (
              <div
                key={story.id + index}
                className={`polaroid-card p-5 transition-transform duration-300 hover:scale-[1.03] ${rot}`}
              >
                {/* Washi Tape */}
                <div className="washi-tape" />

                {/* Photo */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-slate-900 shadow-inner">
                  <Image
                    src={story.image}
                    alt={story.location}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                    <Database className="size-3 text-teal-400" />
                    <span>
                      {story.source === "database_records"
                        ? "Live Database"
                        : "Server Intel"}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="pt-5 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      {story.location}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {story.date}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-700 min-h-[3.5rem] line-clamp-3">
                    {story.summary}
                  </p>

                  {/* Real Plan Metrics */}
                  <div className="mt-4 pt-3 border-t border-amber-900/10 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="size-3 text-amber-700 shrink-0" />
                      <span className="truncate">{story.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Wallet className="size-3 text-amber-700 shrink-0" />
                      <span className="truncate">{story.budget}</span>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center gap-2.5">
                    <div className="relative size-7 overflow-hidden rounded-full ring-1 ring-amber-700/30">
                      <Image
                        src={story.avatar}
                        alt={story.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {story.author}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
