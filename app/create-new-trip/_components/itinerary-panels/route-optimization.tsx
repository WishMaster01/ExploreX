"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { DisplayTrip, MapMarker } from "@/lib/types/trip";
import {
  Car,
  Coffee,
  ExternalLink,
  Gem,
  Hotel,
  Map,
  Route,
  Train,
} from "lucide-react";
import { fadeUp, PanelTitle, MapMetric } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function RouteOptimizationPanel({ trip }: { trip: DisplayTrip }) {
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const markers = useMemo(
    () =>
      trip.mapMarkers.filter(
        (marker) =>
          selectedDay === "all" ||
          marker.type === "hotel" ||
          marker.day === Number(selectedDay),
      ),
    [selectedDay, trip.mapMarkers],
  );
  const activeMarker =
    selectedMarker && markers.includes(selectedMarker)
      ? selectedMarker
      : markers[0];
  const routeDay =
    selectedDay === "all" ? trip.days[0]?.day : Number(selectedDay);
  const dayStops = markers.filter(
    (marker) => marker.type !== "hotel" && marker.day === routeDay,
  );
  const directionsUrl =
    dayStops.length > 1
      ? `https://www.google.com/maps/dir/?api=1&origin=${dayStops[0].coordinates.latitude},${dayStops[0].coordinates.longitude}&destination=${dayStops.at(-1)!.coordinates.latitude},${dayStops.at(-1)!.coordinates.longitude}${
          dayStops.length > 2
            ? `&waypoints=${dayStops
                .slice(1, -1)
                .map(
                  (stop) =>
                    `${stop.coordinates.latitude},${stop.coordinates.longitude}`,
                )
                .join("%7C")}`
            : ""
        }`
      : null;

  const iconFor = (type: MapMarker["type"]) => {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelTitle
            icon={<Map className="size-5" />}
            title="Places & route"
          />
          <label className="text-xs font-semibold text-slate-600">
            <span className="sr-only">Filter map places by day</span>
            <select
              value={selectedDay}
              onChange={(event) => {
                setSelectedDay(event.target.value);
                setSelectedMarker(null);
              }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
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

        {markers.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No usable coordinates are available for the selected places, so a
            map can’t be shown.
          </div>
        ) : (
          <>
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Places with coordinates"
            >
              {markers.map((marker) => (
                <button
                  key={`${marker.type}-${marker.day ?? "stay"}-${marker.label}`}
                  type="button"
                  onClick={() => {
                    setSelectedMarker(marker);
                    setMapVisible(true);
                  }}
                  aria-pressed={activeMarker === marker}
                  className={`inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold ${activeMarker === marker ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {iconFor(marker.type)}
                  <span className="max-w-52 truncate">{marker.label}</span>
                </button>
              ))}
            </div>

            {activeMarker && mapVisible ? (
              <iframe
                title={`Map location for ${activeMarker.label}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="mt-4 h-64 w-full rounded-xl border border-slate-200 sm:h-80"
                src={`https://www.google.com/maps?q=${activeMarker.coordinates.latitude},${activeMarker.coordinates.longitude}&output=embed`}
              />
            ) : (
              <button
                type="button"
                onClick={() => setMapVisible(true)}
                className="mt-4 min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Load map
              </button>
            )}

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Route className="size-4" />
                Open day stops in Google Maps
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Map pins use the itinerary coordinates. Coordinates may be
              AI-generated unless a place name is provider-matched. Turn-by-turn
              routing opens in Google Maps.
            </p>
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MapMetric
            icon={<Train className="size-4" />}
            label="Transit"
            value={trip.transitMinutes}
          />
          <MapMetric
            icon={<Car className="size-4" />}
            label="Distance"
            value={
              trip.distanceSource === "UNAVAILABLE"
                ? "Unavailable"
                : trip.routeDistance
            }
          />
          <MapMetric
            icon={<Route className="size-4" />}
            label="Walk estimate"
            value={trip.walkDistance}
          />
          <MapMetric
            icon={<Gem className="size-4" />}
            label="Distance saved"
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
                : "Straight-line estimates only; these are not driving, walking, or transit directions."}
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
