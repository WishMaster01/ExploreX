"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";

const JourneyMap = dynamic(
  () => import("./JourneyMap").then((module) => module.JourneyMap),
  { ssr: false, loading: () => <JourneyMapPlaceholder /> },
);

export function DeferredJourneyMap() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = anchor.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setShouldLoad(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={anchor}>
      {shouldLoad ? <JourneyMap /> : <JourneyMapPlaceholder />}
    </div>
  );
}

function JourneyMapPlaceholder() {
  return (
    <section
      aria-label="Journey Map"
      className="relative min-h-[760px] overflow-hidden border-t border-white/10 bg-[#090d16] px-4 py-20 sm:px-6 lg:min-h-[700px] lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[340px_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300">
            <Compass className="size-3.5" aria-hidden="true" />
            Destination map
          </div>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Journey Map
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Explore destinations plotted from geographic coordinates.
          </p>
          <p className="mt-6 text-sm text-slate-400" role="status">
            Loading the interactive map…
          </p>
        </div>
        <div
          aria-hidden="true"
          className="aspect-[16/10] w-full motion-safe:animate-pulse rounded-3xl border border-white/10 bg-[#0c121e]"
        />
      </div>
    </section>
  );
}
