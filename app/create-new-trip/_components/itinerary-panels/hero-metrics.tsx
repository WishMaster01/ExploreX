"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  CalendarDays,
  Download,
  MessageSquareShare,
  Plane,
  Route,
  Sparkles,
  Wallet2,
} from "lucide-react";
import { fadeUp, MiniStat } from "./panel-primitives";
import { GlassPanel, MetricCard } from "@/components/travel/TravelUI";
import { Button } from "@/components/ui/button";

export function HeroPanel({
  trip,
  onExport,
  destCity,
}: {
  trip: DisplayTrip;
  onExport: () => void;
  destCity: string;
}) {
  const handleShare = async () => {
    const text = `${trip.origin} → ${trip.destination} · ${trip.duration} · ${trip.budget}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trip to ${destCity}`,
          text,
        });
      } catch {
        // The user cancelled sharing.
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassPanel className="overflow-hidden shadow-[var(--shadow-elevated)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Sparkles className="size-3.5" />
              AI itinerary dashboard
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Your {destCity} adventure — optimized for time, budget, and local
              context.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {trip.origin} → {trip.destination} · {trip.group_size} ·{" "}
              {trip.totalActivities} planned stops
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={handleShare}
                className="btn-shine rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md hover:from-teal-700 hover:to-teal-600"
              >
                <MessageSquareShare className="size-4" />
                Share Summary
              </Button>

              <Button
                variant="outline"
                onClick={onExport}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Download className="size-4" />
                Export Plan
              </Button>
            </div>
          </div>

          <div className="relative min-h-[260px] overflow-hidden lg:min-h-full">
            <Image
              src={trip.heroImage}
              alt={trip.destination}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-2 gap-3 text-white">
              <MiniStat label="Stops" value={String(trip.totalActivities)} />

              <MiniStat
                label="Days"
                value={trip.duration.replace(/[^0-9]/g, "") || "—"}
              />
            </div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function DashboardMetrics({ trip }: { trip: DisplayTrip }) {
  const cards = [
    {
      icon: <Plane className="size-5" />,
      label: "Route",
      value: `${trip.origin} → ${trip.destination.split(",")[0]}`,
      detail: "Suggested destination plan",
    },
    {
      icon: <CalendarDays className="size-5" />,
      label: "Duration",
      value: trip.duration,
      detail: trip.group_size,
    },
    {
      icon: <Wallet2 className="size-5" />,
      label: "Budget",
      value: trip.budget,
      detail: "Estimated total",
    },
    {
      icon: <Route className="size-5" />,
      label: "Transit",
      value: trip.transitMinutes,
      detail: "Road and transit times are unavailable",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          custom={index}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <MetricCard {...card} />
        </motion.div>
      ))}
    </div>
  );
}
