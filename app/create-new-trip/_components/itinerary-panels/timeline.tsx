"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import { DollarSign, MapPin, Timer } from "lucide-react";
import { fadeUp } from "./panel-primitives";
import { GlassPanel, SectionHeading } from "@/components/travel/TravelUI";

export function TimelinePanel({ trip }: { trip: DisplayTrip }) {
  if (trip.days.length === 0) return null;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={0}
    >
      <GlassPanel className="p-5 sm:p-6">
        <SectionHeading
          eyebrow="AI travel timeline"
          title="Day-wise schedule with morning, afternoon, and evening pacing."
          description="AI-generated activity suggestions. Travel times and route distances are estimates, not live road or transit directions."
        />

        <div className="mt-6 space-y-6">
          {trip.days.map((day, dayIdx) => (
            <motion.div
              key={day.day}
              custom={dayIdx}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-600">
                    Day {day.day}
                  </p>
                  <h3 className="mt-1 font-heading text-xl font-bold text-slate-900">
                    {day.title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700">
                    {day.best}
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                    {day.route}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {day.segments.map((segment) => (
                  <div
                    key={`${day.day}-${segment.title}`}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={segment.image}
                        alt={segment.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 1024px) 100vw, 28vw"
                        unoptimized
                      />

                      <div className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {segment.period}
                      </div>
                    </div>

                    <div className="p-4">
                      <h4 className="font-heading font-bold text-slate-900">
                        {segment.title}
                      </h4>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {segment.detail}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        {segment.sourceMetadata?.source === "VERIFIED" &&
                        segment.sourceMetadata.mapsUrl ? (
                          <a
                            href={segment.sourceMetadata.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline"
                          >
                            Name matched · Google Maps
                          </a>
                        ) : (
                          "AI generated · verify hours, prices, and availability"
                        )}
                      </p>

                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3" />
                        <span className="truncate">{segment.address}</span>
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Timer className="size-3.5 text-teal-600" />
                          {segment.duration}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <DollarSign className="size-3.5 text-teal-600" />
                          {segment.cost}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
