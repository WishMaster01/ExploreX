"use client";

import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GlassPanel,
  MetricCard,
  SectionHeading,
  insightCards,
  quickFeatureCards,
  travelGradient,
} from "@/components/travel/TravelUI";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  Globe2,
  MapPin,
  Plane,
  Route,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export const suggestions = [
  {
    title: "Create New Trip",
    icon: <Globe2 className="size-4 text-teal-600" />,
  },
  {
    title: "Inspire Me Where To Go Next",
    icon: <Plane className="size-4 text-sky-600" />,
  },
  {
    title: "Discover Hidden Gems",
    icon: <MapPin className="size-4 text-amber-600" />,
  },
  {
    title: "Adventure Destination",
    icon: <Route className="size-4 text-rose-500" />,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Hero = () => {
  const { user } = useUser();
  const router = useRouter();
  const [tripIdea, setTripIdea] = useState("");

  const handleCreateTrip = () => {
    const query = new URLSearchParams();
    if (tripIdea.trim()) {
      query.set("idea", tripIdea.trim());
      query.set("autostart", "1");
    }
    const destination = `/create-new-trip${query.size ? `?${query}` : ""}`;
    router.push(
      user
        ? destination
        : `/sign-in?redirect_url=${encodeURIComponent(destination)}`,
    );
  };

  return (
    <div className={travelGradient}>
      <section className="relative isolate flex overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-10 lg:pb-24 lg:pt-36 2xl:px-12">
        <div className="relative mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)] xl:gap-16 2xl:gap-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-2xl text-center xl:max-w-3xl"
          >
            <motion.div variants={itemVariants}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 shadow-sm backdrop-blur">
                <Sparkles className="size-3.5" />
                AI-powered travel studio
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.65rem] 2xl:text-[4.2rem]"
            >
              Plan smarter trips with a{" "}
              <span className="gradient-text">copilot</span> that thinks like a
              local.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg 2xl:text-xl 2xl:leading-8"
            >
              Shape a trip around your dates, budget, pace, and interests.
              Explore a day-by-day plan with route and cost estimates you can
              review and refine.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Button
                onClick={handleCreateTrip}
                className="btn-shine h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-7 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:from-teal-700 hover:to-teal-600"
              >
                Start Planning
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/ai-features")}
                className="h-12 rounded-xl border-slate-200 bg-white/80 px-7 text-base font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white hover:text-slate-900"
              >
                Explore AI Features
              </Button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassPanel className="mx-auto mt-8 max-w-2xl border-white/80 bg-white/90 p-4 text-left shadow-[var(--shadow-elevated)] backdrop-blur-xl">
                <div className="relative">
                  <Textarea
                    value={tripIdea}
                    onChange={(event) => setTripIdea(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleCreateTrip();
                      }
                    }}
                    aria-label="Trip idea"
                    placeholder="Where would you like to go? Add dates, budget, or interests..."
                    className="min-h-28 resize-none rounded-xl border-slate-200 bg-white/90 p-4 pr-14 text-base text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-teal-500/40"
                  />
                  <Button
                    size="icon"
                    onClick={handleCreateTrip}
                    aria-label="Start planning this trip"
                    className="absolute bottom-3 right-3 size-10 rounded-lg bg-teal-600 text-white shadow-md hover:bg-teal-700"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.title}
                      type="button"
                      onClick={handleCreateTrip}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 hover:shadow-sm"
                    >
                      {suggestion.icon}
                      {suggestion.title}
                    </button>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-[680px] lg:max-w-none"
          >
            <GlassPanel className="relative overflow-hidden p-3 shadow-[var(--shadow-elevated)] sm:p-4">
              <div className="overflow-hidden rounded-xl [&_img]:aspect-[4/3] [&_img]:h-auto [&_img]:object-cover lg:[&_img]:aspect-[16/13] 2xl:[&_img]:aspect-[4/3]">
                <HeroVideoDialog
                  className="rounded-xl"
                  animationStyle="from-center"
                  videoSrc="https://www.youtube.com/embed/2eLqU5Z1v6I"
                  thumbnailSrc="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=80"
                  thumbnailAlt="Travel planning dashboard preview"
                />
              </div>
              <div className="grid gap-3 pt-3 sm:grid-cols-3 sm:pt-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <Bot className="size-5 text-teal-700" />
                  <p className="mt-2 font-heading font-bold text-slate-900 sm:mt-3">
                    Personalized planning
                  </p>
                  <p className="text-xs text-slate-500">
                    Dates, budget and interests
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <Route className="size-5 text-sky-600" />
                  <p className="mt-2 font-heading font-bold text-slate-900 sm:mt-3">
                    Route planning
                  </p>
                  <p className="text-xs text-slate-500">
                    Distances labeled by source
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <Wallet className="size-5 text-amber-600" />
                  <p className="mt-2 font-heading font-bold text-slate-900 sm:mt-3">
                    Budget estimates
                  </p>
                  <p className="text-xs text-slate-500">
                    Review costs by category
                  </p>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </section>

      <section id="ai-features" className="border-y border-slate-200/70 bg-white/55 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            align="center"
            eyebrow="AI travel intelligence"
            title="A practical workspace for building a better trip."
            description="Explore an itinerary, its route and distance estimates, budget allocation, accommodation, dining suggestions, and travel checklists in one place."
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {insightCards.map((card) => (
              <motion.div key={card.label} variants={itemVariants}>
                <MetricCard {...card} />
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {quickFeatureCards.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <GlassPanel hover className="group h-full p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 p-3 text-white shadow-md shadow-teal-500/20 transition group-hover:scale-105">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-slate-900">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {feature.text}
                      </p>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-8 text-center shadow-sm sm:flex-row sm:p-10 sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
              Your plans now have a dedicated home.
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Search, sort, favorite, and manage every itinerary from Saved
              Trips.
            </p>
          </div>
          <Button
            onClick={() => router.push("/saved-trips")}
            className="shrink-0 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
          >
            Open Saved Trips <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Hero;
