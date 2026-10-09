"use client";

import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  Bus,
  Car,
  Compass,
  DollarSign,
  Globe2,
  HeartHandshake,
  Languages,
  MessageSquareShare,
  Phone,
  Plane,
  Route,
} from "lucide-react";
import { fadeUp, PanelTitle } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function TransportationPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Plane, Bus, Route, Car];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={2}
    >
      <GlassPanel className="p-5">
        <PanelTitle icon={<Bus className="size-5" />} title="Transportation" />

        <div className="mt-4 space-y-2.5">
          {trip.transportation.map((transport, index) => {
            const Icon = icons[index % icons.length];

            return (
              <div
                key={transport.mode}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon className="size-4" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {transport.mode}
                    </p>
                    <p className="text-sm font-bold text-teal-600">
                      {transport.value}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">{transport.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function LocalEssentialsPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Phone, DollarSign, Languages, HeartHandshake, Globe2];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={3}
    >
      <GlassPanel className="p-5">
        <PanelTitle
          icon={<Globe2 className="size-5" />}
          title="Local Essentials"
        />

        <div className="mt-4 space-y-2.5">
          {trip.localEssentials.map((item, index) => {
            const Icon = icons[index % icons.length];

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
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

export function TripComparisonPanel({ trip }: { trip: DisplayTrip }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={0}
    >
      <GlassPanel className="p-5 sm:p-6">
        <PanelTitle
          icon={<Compass className="size-5" />}
          title="Trip Style Comparison"
        />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {trip.tripComparison.map((plan) => (
            <div
              key={plan.label}
              className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                plan.recommended
                  ? "border-teal-300 bg-teal-50/50 ring-2 ring-teal-500/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h3 className="font-heading font-bold text-slate-900">
                {plan.label}
              </h3>

              {plan.recommended && (
                <span className="mt-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Your plan
                </span>
              )}

              <p className="mt-3 text-lg font-bold text-teal-600">
                {plan.value}
              </p>

              <p className="mt-1 text-sm text-slate-600">{plan.detail}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function SharingPanel({ onExport }: { onExport: () => void }) {
  const items = [
    "Private trip",
    "Collaboration is not available",
    "Public sharing is not available",
    "Export plan",
  ];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={4}
    >
      <GlassPanel className="p-5">
        <PanelTitle
          icon={<MessageSquareShare className="size-5" />}
          title="Trip Sharing"
        />

        <div className="mt-5 space-y-2.5">
          {items.map((item, index) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-700 shadow-sm"
            >
              <span>{item}</span>

              {index === 3 ? (
                <button
                  type="button"
                  onClick={onExport}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Export
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  {index === 0 ? "Only you" : "Coming later"}
                </span>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
