"use client";

import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FloatingElement,
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
  CalendarDays,
  Globe2,
  MapPin,
  Plane,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import React from "react";
import UserTrips from "./UserTrips";

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

  const handleCreateTrip = () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    router.push("/create-new-trip");
  };

  return (
    <div className={travelGradient}>
      <section className="relative isolate flex min-h-[calc(100svh-4.25rem)] overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pb-12 lg:pt-28 2xl:px-12">
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-20 size-96 rounded-full bg-teal-200/30 blur-3xl animate-gradient-shift" />
          <div className="absolute -right-32 top-40 size-80 rounded-full bg-sky-200/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 size-96 -translate-x-1/2 rounded-full bg-amber-100/20 blur-3xl" />
        </div>

        {/* Floating travel elements */}
        <FloatingElement className="absolute left-6 top-36 hidden xl:block 2xl:left-10" delay={0.2}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-teal-600" />
            Safety score: A
          </div>
        </FloatingElement>
        <FloatingElement className="absolute right-6 top-40 hidden 2xl:right-10 2xl:block" delay={0.4}>
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-amber-600" />
            Route saves 38 min
          </div>
        </FloatingElement>
        <FloatingElement className="absolute bottom-16 left-8 hidden 2xl:block" delay={0.6}>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-sky-600" />
            120+ destinations
          </div>
        </FloatingElement>

        <div className="relative mx-auto grid w-full max-w-[1760px] flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.82fr)] xl:gap-14 2xl:gap-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left xl:max-w-3xl"
          >
            <motion.div variants={itemVariants}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 shadow-sm backdrop-blur">
                <Sparkles className="size-3.5" />
                AI-powered travel studio
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-balance font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.75rem] lg:leading-[1.05] 2xl:text-[4.4rem]"
            >
              Plan smarter trips with a{" "}
              <span className="gradient-text">copilot</span> that thinks like a local.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0 2xl:text-xl 2xl:leading-8"
            >
              Build itineraries, optimize routes, compare budgets, track packing, and surface destination intelligence in one polished travel workspace.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
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
                onClick={() => document.getElementById("ai-features")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 rounded-xl border-slate-200 bg-white/80 px-7 text-base font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white hover:text-slate-900"
              >
                Explore AI Features
              </Button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassPanel className="mt-8 max-w-3xl p-4 text-left shadow-[var(--shadow-elevated)]">
                <div className="relative">
                  <Textarea
                    aria-label="Trip idea"
                    placeholder="Ask for a 5-day Tokyo trip with food markets, hidden gems, and a standard budget..."
                    className="min-h-28 resize-none rounded-xl border-slate-200 bg-white/90 p-4 pr-14 text-base text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-teal-500/40"
                  />
                  <Button
                    size="icon"
                    onClick={handleCreateTrip}
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
            className="relative mx-auto w-full max-w-[640px] lg:max-w-none"
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-teal-200/40 via-sky-200/30 to-amber-100/30 blur-3xl" />
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
                <div className="rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 p-3 text-white shadow-lg shadow-teal-500/20 sm:p-4">
                  <Bot className="size-5" />
                  <p className="mt-2 font-heading text-xl font-bold sm:mt-3">AI</p>
                  <p className="text-xs text-teal-100">Live copilot</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <Route className="size-5 text-sky-600" />
                  <p className="mt-2 font-heading text-xl font-bold text-slate-900 sm:mt-3">38m</p>
                  <p className="text-xs text-slate-500">Time saved</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <CalendarDays className="size-5 text-amber-600" />
                  <p className="mt-2 font-heading text-xl font-bold text-slate-900 sm:mt-3">7 days</p>
                  <p className="text-xs text-slate-500">Ready to refine</p>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </section>

      <section id="ai-features" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            align="center"
            eyebrow="AI travel intelligence"
            title="Everything a premium travel platform needs, structured for real AI workflows."
            description="Ready for generated recommendations, itinerary comparison, personalization, maps, budgets, insights, packing, sharing, and analytics."
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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

      <section id="saved-trips" className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <UserTrips />
        </div>
      </section>
    </div>
  );
};

export default Hero;
