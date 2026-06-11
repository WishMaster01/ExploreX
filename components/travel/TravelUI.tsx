"use client";

import { cn } from "@/lib/utils";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Compass,
  DollarSign,
  Globe2,
  Instagram,
  Linkedin,
  Map,
  MessageCircle,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Twitter,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

export const travelGradient = "travel-page-bg";

export function GlassPanel({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl transition-all duration-300",
        hover && "hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className={cn(
        "mx-auto max-w-3xl",
        align === "center" ? "text-center" : "text-left",
      )}
    >
      {eyebrow && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/90 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </div>
      )}
      <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          {description}
        </p>
      )}
    </motion.div>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  detail,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <GlassPanel hover className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-heading text-2xl font-bold text-slate-900">
            {value}
          </p>
          {detail && <p className="mt-1.5 text-sm text-slate-500">{detail}</p>}
        </div>
        <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-sky-50 p-2.5 text-teal-600 shadow-sm">
          {icon}
        </div>
      </div>
    </GlassPanel>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm",
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="h-3.5 w-1/3 rounded-full bg-slate-200" />
      <div className="mt-5 h-24 rounded-xl bg-slate-100" />
      <div className="mt-4 h-3 w-5/6 rounded-full bg-slate-100" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-100" />
    </div>
  );
}

export function AIThinking({
  message = "AI is mapping the best route",
}: {
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-white/90 px-4 py-3.5 text-sm text-slate-700 shadow-sm backdrop-blur"
    >
      <div className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white animate-ai-pulse">
        <Bot className="size-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{message}</p>
        <div className="mt-2 flex gap-1.5">
          <span className="size-2 animate-bounce rounded-full bg-teal-500" />
          <span className="size-2 animate-bounce rounded-full bg-sky-500 [animation-delay:120ms]" />
          <span className="size-2 animate-bounce rounded-full bg-amber-400 [animation-delay:240ms]" />
        </div>
      </div>
    </motion.div>
  );
}

export function FloatingElement({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "glass-card rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 shadow-lg",
        delay % 2 === 0 ? "animate-float-soft" : "animate-float-delayed",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function AITravelCopilot() {
  const [open, setOpen] = useState(false);
  const starterTips = [
    "Reduce my travel time tomorrow",
    "Where should I eat near the Louvre?",
    "Make this trip more budget friendly",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm"
          >
            <GlassPanel className="overflow-hidden shadow-[var(--shadow-elevated)]">
              <div className="border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                      <Bot className="size-5" />
                    </div>
                    <div>
                      <p className="font-heading font-bold">
                        AI Travel Copilot
                      </p>
                      <p className="text-xs text-teal-100">
                        Context-aware assistant
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close AI copilot"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm leading-6 text-slate-600">
                  I can refine itinerary timing, compare budgets, suggest safer
                  routes, and answer questions about your generated plans.
                </div>
                <div className="space-y-2">
                  {starterTips.map((tip) => (
                    <button
                      type="button"
                      key={tip}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700"
                    >
                      {tip}
                      <ChevronRight className="size-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <input
                    aria-label="Ask the AI travel copilot"
                    placeholder="Ask about your trip..."
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <Button
                    size="icon"
                    className="size-9 rounded-lg bg-teal-600 hover:bg-teal-700"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-label="Open AI travel copilot"
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="group flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-[0_12px_40px_rgba(20,184,166,0.35)]"
      >
        {open ? (
          <X className="size-6" />
        ) : (
          <MessageCircle className="size-6 transition group-hover:scale-110" />
        )}
      </motion.button>
    </div>
  );
}

export function TravelFooter() {
  const platformLinks = [
    { label: "AI Planner", href: "/create-new-trip" },
    { label: "Saved Trips", href: "/#saved-trips" },
    { label: "Explore Cities", href: "/#explore" },
    { label: "AI Features", href: "/#ai-features" },
  ];

  const socialLinks = [
    { icon: <Twitter className="size-4" />, label: "Twitter", href: "#" },
    { icon: <Instagram className="size-4" />, label: "Instagram", href: "#" },
    { icon: <Linkedin className="size-4" />, label: "LinkedIn", href: "#" },
  ];

  return (
    <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-lg shadow-slate-900/10">
                <Image
                  src="/ExploreX_LOGO_header.png"
                  alt="ExploreX"
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Intelligent travel studio
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
              Plan, optimize, compare, and share richer travel experiences with
              an AI assistant built for modern explorers.
            </p>
            <div className="mt-5 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-heading text-sm font-bold text-slate-900">
              Platform
            </p>
            <div className="mt-4 grid gap-2.5">
              {platformLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-600 transition hover:text-teal-600"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-heading text-sm font-bold text-slate-900">
              AI Features
            </p>
            <div className="mt-4 grid gap-2.5 text-sm text-slate-600">
              <span>Route Optimization</span>
              <span>Smart Budget</span>
              <span>Destination Intel</span>
              <span>Packing Assistant</span>
            </div>
          </div>

          <div>
            <p className="font-heading text-sm font-bold text-slate-900">
              Travel Signals
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: <CloudSun className="size-4" />, label: "Weather" },
                { icon: <ShieldCheck className="size-4" />, label: "Safety" },
                { icon: <Route className="size-4" />, label: "Routes" },
                { icon: <DollarSign className="size-4" />, label: "Budget" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs font-medium text-slate-600"
                >
                  <span className="text-teal-600">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} ExploreX. Crafted for intelligent
            travel.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export const insightCards = [
  {
    icon: <CloudSun className="size-5" />,
    label: "Weather fit",
    value: "92%",
    detail: "Mild, low-rain window",
  },
  {
    icon: <ShieldCheck className="size-5" />,
    label: "Safety score",
    value: "A",
    detail: "Well-lit central routes",
  },
  {
    icon: <Users className="size-5" />,
    label: "Crowd forecast",
    value: "Medium",
    detail: "Shift icons to mornings",
  },
  {
    icon: <Map className="size-5" />,
    label: "Route gain",
    value: "38 min",
    detail: "Saved by clustering stops",
  },
];

export const quickFeatureCards = [
  {
    icon: <Route className="size-5" />,
    title: "Itinerary optimization",
    text: "Restructure days by distance, opening hours, and crowd windows.",
  },
  {
    icon: <DollarSign className="size-5" />,
    title: "Smart budget planner",
    text: "Compare budget, standard, and luxury estimates before booking.",
  },
  {
    icon: <Compass className="size-5" />,
    title: "Destination intelligence",
    text: "Surface hidden gems, food picks, photo spots, and local etiquette.",
  },
  {
    icon: <CalendarDays className="size-5" />,
    title: "Travel timeline",
    text: "Segment mornings, afternoons, evenings, and transfers in one dashboard.",
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: "Packing assistant",
    text: "Generate destination and weather-aware checklists with progress tracking.",
  },
  {
    icon: <Globe2 className="size-5" />,
    title: "Trip sharing",
    text: "Prepare public, private, collaborator, and export-ready trip views.",
  },
];
