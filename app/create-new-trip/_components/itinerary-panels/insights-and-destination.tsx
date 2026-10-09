"use client";

import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  CloudSun,
  Compass,
  Gem,
  Globe2,
  HeartHandshake,
  ShieldCheck,
  Sun,
  Utensils,
  Users,
} from "lucide-react";
import { fadeUp, PanelTitle } from "./panel-primitives";
import { GlassPanel, SectionHeading } from "@/components/travel/TravelUI";

export function InsightsPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Sun, Users, ShieldCheck, HeartHandshake, CloudSun, Globe2];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={2}
    >
      <GlassPanel className="p-5">
        <PanelTitle
          icon={<CloudSun className="size-5" />}
          title="AI Travel Insights"
        />

        <div className="mt-5 grid gap-3">
          {trip.insights.map((item, index) => {
            const Icon = icons[index % icons.length];

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="size-4" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>

                  <p className="text-sm font-medium text-slate-800">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function DestinationIntelPanel({
  trip,
  destCity,
}: {
  trip: DisplayTrip;
  destCity: string;
}) {
  const groups = [
    {
      icon: <BadgeCheck className="size-5" />,
      title: "Top attractions",
      items: trip.topAttractions,
    },
    {
      icon: <Gem className="size-5" />,
      title: "From your plan",
      items: trip.days
        .flatMap((day) => day.segments.map((segment) => segment.title))
        .slice(3, 6),
    },
    {
      icon: <Camera className="size-5" />,
      title: "Photo spots",
      items: trip.days
        .flatMap((day) =>
          day.segments
            .filter((segment) => segment.period === "Morning")
            .map((segment) => segment.title),
        )
        .slice(0, 3),
    },
    {
      icon: <Utensils className="size-5" />,
      title: "Food & dining",
      items: trip.restaurants.map((restaurant) => restaurant.name),
    },
    {
      icon: <Users className="size-5" />,
      title: "Group fit",
      items: [
        `Optimized for ${trip.group_size}`,
        `${trip.duration} pacing`,
        `${trip.totalActivities} activities`,
      ],
    },
    {
      icon: <Compass className="size-5" />,
      title: `${destCity} highlights`,
      items: trip.days.map((day) => day.title).slice(0, 3),
    },
  ];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={0}
    >
      <GlassPanel className="p-5 sm:p-6">
        <SectionHeading
          eyebrow="Destination intelligence"
          title="Attractions, dining, and experience lanes from your AI plan."
          description={`Personalized for ${trip.group_size} traveling to ${trip.destination}.`}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
                  {group.icon}
                </div>

                <h3 className="font-heading font-bold text-slate-900">
                  {group.title}
                </h3>
              </div>

              <div className="space-y-2">
                {group.items.filter(Boolean).map((item) => (
                  <p
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-teal-500" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
