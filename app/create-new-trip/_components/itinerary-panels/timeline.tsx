"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  Pencil,
  Timer,
  Trash2,
} from "lucide-react";
import { fadeUp } from "./panel-primitives";
import { GlassPanel, SectionHeading } from "@/components/travel/TravelUI";
import { useTripPlan } from "@/context/TripPlanContext";

export function TimelinePanel({ trip }: { trip: DisplayTrip }) {
  const [selectedDay, setSelectedDay] = useState("all");
  const [completed, setCompleted] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const { tripDetails, setTripDetails } = useTripPlan();
  if (trip.days.length === 0) return null;

  const visibleDays =
    selectedDay === "all"
      ? trip.days
      : trip.days.filter((day) => day.day === Number(selectedDay));

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={0}
    >
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Your itinerary"
            title="A day-by-day plan you can work from."
            description="Suggestions may need confirmation. Travel distance and timing are estimates unless a provider source is shown."
          />
          <label className="shrink-0 text-sm font-medium text-slate-700">
            <span className="sr-only">Filter itinerary by day</span>
            <select
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <option value="all">All days</option>
              {trip.days.map((day) => (
                <option key={day.day} value={day.day}>
                  Day {day.day}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 space-y-5">
          {visibleDays.map((day) => (
            <section
              key={day.day}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">
                    Day {day.day}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-bold text-slate-900">
                    {day.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                    {day.best}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                    {day.route}
                  </span>
                </div>
              </div>

              {day.segments.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                  No activities planned for this day yet.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {day.segments.map((segment, index) => {
                    const key = `${day.day}-${segment.title}-${index}`;
                    const isComplete = completed.includes(key);
                    const isExpanded = expanded.includes(key);
                    const query = segment.coordinates
                      ? `${segment.coordinates.latitude},${segment.coordinates.longitude}`
                      : `${segment.title} ${segment.address}`;
                    const mapsUrl =
                      segment.sourceMetadata?.mapsUrl ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                    return (
                      <li
                        key={key}
                        className={`rounded-xl border bg-white p-4 ${isComplete ? "border-teal-200 bg-teal-50/30" : "border-slate-200"}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="flex min-w-24 items-center gap-2 text-sm font-semibold text-teal-800">
                            <Clock3 className="size-4 shrink-0" />
                            {segment.period}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`font-heading font-bold ${isComplete ? "text-slate-500 line-through" : "text-slate-900"}`}
                              >
                                {segment.title}
                              </h4>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${segment.sourceMetadata?.source === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                              >
                                {segment.sourceMetadata?.source === "VERIFIED"
                                  ? "Name matched"
                                  : "AI suggestion · confirm details"}
                              </span>
                            </div>
                            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                              {segment.address}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <Timer className="size-3.5 text-slate-400" />
                                {segment.duration}
                              </span>
                              <span className="font-medium">
                                Cost estimate: {segment.cost}
                              </span>
                              {segment.distanceKm !== undefined && (
                                <span>
                                  {segment.distanceKm.toFixed(1)} km from
                                  previous stop · estimate
                                </span>
                              )}
                            </div>
                            {editing === key ? (
                              <form
                                className="mt-3 space-y-2 border-t border-slate-100 pt-3"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  if (!tripDetails || !editTitle.trim()) return;
                                  setTripDetails({
                                    ...tripDetails,
                                    itinerary: tripDetails.itinerary.map(
                                      (tripDay) =>
                                        tripDay.day !== day.day
                                          ? tripDay
                                          : {
                                              ...tripDay,
                                              activities:
                                                tripDay.activities.map(
                                                  (activity, activityIndex) =>
                                                    activityIndex === index
                                                      ? {
                                                          ...activity,
                                                          place_name:
                                                            editTitle.trim(),
                                                          place_details:
                                                            editDetail.trim(),
                                                        }
                                                      : activity,
                                                ),
                                            },
                                    ),
                                  });
                                  setEditing(null);
                                }}
                              >
                                <label className="block text-xs font-semibold text-slate-700">
                                  Activity
                                  <input
                                    value={editTitle}
                                    onChange={(event) =>
                                      setEditTitle(event.target.value)
                                    }
                                    required
                                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                                  />
                                </label>
                                <label className="block text-xs font-semibold text-slate-700">
                                  Details
                                  <textarea
                                    value={editDetail}
                                    onChange={(event) =>
                                      setEditDetail(event.target.value)
                                    }
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  />
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    className="min-h-10 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white"
                                  >
                                    Save changes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              isExpanded && (
                                <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">
                                  {segment.detail}
                                </p>
                              )
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1 sm:justify-end">
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              aria-label={`Navigate to ${segment.title}`}
                            >
                              <ExternalLink className="size-3.5" />
                              Map
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((items) =>
                                  isExpanded
                                    ? items.filter((item) => item !== key)
                                    : [...items, key],
                                )
                              }
                              className="min-h-10 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? "Less" : "Details"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(key);
                                setEditTitle(segment.title);
                                setEditDetail(segment.detail);
                              }}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!tripDetails) return;
                                setTripDetails({
                                  ...tripDetails,
                                  itinerary: tripDetails.itinerary.map(
                                    (tripDay) =>
                                      tripDay.day !== day.day
                                        ? tripDay
                                        : {
                                            ...tripDay,
                                            activities:
                                              tripDay.activities.filter(
                                                (_, activityIndex) =>
                                                  activityIndex !== index,
                                              ),
                                          },
                                  ),
                                });
                              }}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="size-3.5" />
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCompleted((items) =>
                                  isComplete
                                    ? items.filter((item) => item !== key)
                                    : [...items, key],
                                )
                              }
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                              aria-pressed={isComplete}
                            >
                              <Check className="size-3.5" />
                              {isComplete ? "Done" : "Mark done"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
