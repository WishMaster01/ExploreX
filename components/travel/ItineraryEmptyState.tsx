"use client";

import { GlassPanel } from "@/components/travel/TravelUI";
import { useTripPlan } from "@/context/TripPlanContext";
import {
  Bot,
  CalendarDays,
  Compass,
  Map,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";

export function ItineraryEmptyState() {
  const { tripLoading } = useTripPlan();

  const steps = [
    { icon: <MapPin className="size-5" />, title: "Share destination", desc: "Tell the copilot where you want to go" },
    { icon: <Wallet className="size-5" />, title: "Set budget & group", desc: "Pick budget tier and travel companions" },
    { icon: <CalendarDays className="size-5" />, title: "Choose duration", desc: "How many days for your adventure" },
    { icon: <Sparkles className="size-5" />, title: "AI builds your plan", desc: "Hotels, timeline, map & insights appear here" },
  ];

  return (
    <div className="travel-page-bg flex min-h-[calc(100vh-4.25rem)] items-center p-6 sm:p-10">
      <div className="mx-auto w-full max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-xl shadow-teal-500/30">
            {tripLoading ? (
              <Bot className="size-9 animate-pulse" />
            ) : (
              <Compass className="size-9" />
            )}
          </div>

          <h2 className="mt-6 font-display text-3xl font-bold text-slate-900">
            {tripLoading ? "Building your itinerary…" : "Your trip dashboard awaits"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            {tripLoading
              ? "AI is generating hotels, day-by-day plans, budget estimates, and travel essentials. This panel will update automatically."
              : "Chat with the AI copilot on the left to plan your trip. Your full itinerary, map, budget, packing list, and travel checklist will appear here."}
          </p>
        </motion.div>

        {!tripLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8 grid gap-3 sm:grid-cols-2"
          >
            {steps.map((step, i) => (
              <GlassPanel key={step.title} className="p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    {step.icon}
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-slate-900">
                      {i + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{step.desc}</p>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </motion.div>
        )}

        {tripLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/80 shadow-sm" />
            ))}
          </motion.div>
        )}

        {!tripLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700"
          >
            <Map className="size-3.5" />
            Includes map, budget, documents, transport & booking checklist
          </motion.div>
        )}
      </div>
    </div>
  );
}
