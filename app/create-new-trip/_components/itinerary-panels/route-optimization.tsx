"use client";

import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import {
  Car,
  Coffee,
  Gem,
  Hotel,
  Map,
  Route,
  Sparkles,
  Train,
} from "lucide-react";
import { fadeUp, PanelTitle, MapMetric } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function RouteOptimizationPanel({ trip }: { trip: DisplayTrip }) {
  const iconFor = (type: string) => {
    if (type === "hotel") return <Hotel className="size-4" />;
    if (type === "food") return <Coffee className="size-4" />;
    return <Gem className="size-4" />;
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={0}
    >
      <GlassPanel className="p-5">
        <PanelTitle icon={<Map className="size-5" />} title="Interactive Map" />

        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50 via-sky-50 to-white">
          {trip.mapMarkers.length > 1 && (
            <div className="absolute left-[20%] top-[30%] h-0.5 w-[50%] rotate-[15deg] bg-teal-500/50" />
          )}

          {trip.mapMarkers.map((marker) => (
            <div
              key={marker.label}
              className="absolute"
              style={{
                left: marker.left,
                top: marker.top,
              }}
            >
              <div className="flex size-10 animate-pulse-route items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg">
                {iconFor(marker.type)}
              </div>

              <p className="mt-1 max-w-[72px] truncate rounded-full border border-white bg-white/90 px-2 py-0.5 text-center text-[10px] font-bold text-slate-700 shadow-sm">
                {marker.label}
              </p>
            </div>
          ))}

          <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs leading-5 text-slate-600 shadow-md backdrop-blur">
            {trip.mapTip}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MapMetric
            icon={<Train className="size-4" />}
            label="Transit"
            value={trip.transitMinutes}
          />

          <MapMetric
            icon={<Car className="size-4" />}
            label="Distance estimate"
            value={
              trip.distanceSource === "UNAVAILABLE"
                ? "Unavailable"
                : trip.routeDistance
            }
          />

          <MapMetric
            icon={<Route className="size-4" />}
            label="Walking distance"
            value={trip.walkDistance}
          />

          <MapMetric
            icon={<Sparkles className="size-4" />}
            label="Estimated distance saved"
            value={trip.distanceSaved}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {trip.distanceSource === "PROVIDER_ROUTE"
            ? "Distance comes from a routing provider."
            : trip.distanceSource === "MIXED_ESTIMATE"
              ? "Some legs use provider routes; missing legs use straight-line estimates."
              : trip.distanceSource === "UNAVAILABLE"
                ? "Distance is unavailable because the itinerary has no usable route coordinates."
                : "Straight-line estimates only; no road or transit travel times are available."}
        </p>
        {trip.qualityScore !== undefined && (
          <div className="mt-3 rounded-lg bg-teal-50 p-3 text-xs text-slate-700">
            <strong>Itinerary quality: {trip.qualityScore}/100</strong>
            {trip.decisionReasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {trip.decisionReasons.slice(0, 4).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
}
