"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Luggage,
} from "lucide-react";
import { fadeUp, PanelTitle } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function PackingPanel({ trip }: { trip: DisplayTrip }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (index: number) => {
    setChecked((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  };

  const done = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done / trip.packingItems.length) * 100) || 0;

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
          icon={<Luggage className="size-5" />}
          title="Smart Packing"
        />

        <div className="mt-5 space-y-2.5">
          {trip.packingItems.map((item, index) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30"
            >
              <input
                type="checkbox"
                checked={!!checked[index]}
                onChange={() => toggle(index)}
                className="size-4 rounded border-slate-300 accent-teal-600"
              />
              {item}
            </label>
          ))}
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {progress}% packed for {trip.destination.split(",")[0]}.
        </p>
      </GlassPanel>
    </motion.div>
  );
}

export function TravelDocumentsPanel({ trip }: { trip: DisplayTrip }) {
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
          icon={<FileText className="size-5" />}
          title="Travel Documents"
        />

        <p className="mt-2 text-xs text-slate-500">
          Essential paperwork for {trip.destination}
        </p>

        <div className="mt-4 space-y-2.5">
          {trip.travelDocuments.map((document) => (
            <div
              key={document.item}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <BookOpen className="size-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {document.item}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{document.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function BookingChecklistPanel({ trip }: { trip: DisplayTrip }) {
  const [booked, setBooked] = useState<Record<number, boolean>>({});

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={1}
    >
      <GlassPanel className="p-5 sm:p-6">
        <PanelTitle
          icon={<ClipboardList className="size-5" />}
          title="Booking Checklist"
        />

        <p className="mt-2 text-xs text-slate-500">
          Track reservations before you depart
        </p>

        <div className="mt-4 space-y-2">
          {trip.bookingChecklist.map((item, index) => {
            const isBooked = booked[index] ?? item.booked;

            return (
              <label
                key={item.item}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-teal-200"
              >
                <span className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isBooked}
                    onChange={() =>
                      setBooked((previous) => ({
                        ...previous,
                        [index]: !isBooked,
                      }))
                    }
                    className="size-4 accent-teal-600"
                  />
                  {item.item}
                </span>

                {isBooked && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-teal-600">
                    <CheckCircle2 className="size-3.5" />
                    Done
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
