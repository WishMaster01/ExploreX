"use client";

import {
  BarChart3,
  MapPinned,
  Users,
  WandSparkles,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type Analytics = {
  windowDays: number;
  activeUsers: number;
  totalTrips: number;
  events: Array<{ type: string; success: boolean; count: number }>;
  popularDestinations: Array<{ destination: string; count: number }>;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? "Admin access is required."
              : "Analytics could not be loaded.",
          );
        return response.json();
      })
      .then(setData)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Analytics could not be loaded.",
        ),
      );
  }, []);

  return (
    <main className="min-h-screen bg-[#070b14] text-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300">
          <Activity className="size-3.5" />
          Operating Telemetry
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
          ExploreX Operating Metrics
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Aggregated system performance and itinerary analytics over the last 30
          days.
        </p>

        {error && (
          <div className="mt-8 rounded-3xl border border-rose-500/30 bg-rose-950/40 p-5 text-sm font-semibold text-rose-300">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="mt-8 text-sm text-slate-400">
            Loading spatial analytics…
          </div>
        )}

        {data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Metric
                icon={<Users />}
                label="Active travelers"
                value={data.activeUsers}
              />
              <Metric
                icon={<MapPinned />}
                label="Generated trips"
                value={data.totalTrips}
              />
              <Metric
                icon={<WandSparkles />}
                label="AI anomalies"
                value={data.events
                  .filter(
                    (event) => event.type === "ai_generation" && !event.success,
                  )
                  .reduce((sum, event) => sum + event.count, 0)}
              />
            </div>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
                <h2 className="font-heading text-lg font-bold text-white">
                  Popular Destinations
                </h2>
                <div className="mt-4 space-y-2.5">
                  {data.popularDestinations.map((item, index) => (
                    <div
                      key={item.destination}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs"
                    >
                      <span className="font-semibold text-slate-200">
                        {index + 1}. {item.destination}
                      </span>
                      <span className="font-mono font-bold text-teal-400">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
                <h2 className="font-heading text-lg font-bold text-white">
                  Event Breakdown
                </h2>
                <div className="mt-4 space-y-2.5">
                  {data.events.map((event) => (
                    <div
                      key={`${event.type}-${event.success}`}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs"
                    >
                      <span className="font-medium text-slate-300">
                        {event.type.replaceAll("_", " ")} ·{" "}
                        {event.success ? "success" : "failed"}
                      </span>
                      <span className="font-mono font-bold text-teal-400">
                        {event.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl sm:text-4xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}
