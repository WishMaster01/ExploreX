"use client";

import { BarChart3, MapPinned, Users, WandSparkles } from "lucide-react";
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
        if (!response.ok) throw new Error(response.status === 403 ? "Admin access is required." : "Analytics could not be loaded.");
        return response.json();
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Analytics could not be loaded."));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Admin analytics</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900">ExploreX operating metrics</h1>
        <p className="mt-2 text-sm text-slate-500">Aggregated over the last 30 days.</p>
        {error && <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>}
        {!data && !error && <div className="mt-8 text-sm text-slate-500">Loading analytics…</div>}
        {data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Metric icon={<Users />} label="Active users" value={data.activeUsers} />
              <Metric icon={<MapPinned />} label="Generated trips" value={data.totalTrips} />
              <Metric icon={<WandSparkles />} label="AI failures" value={data.events.filter((event) => event.type === "ai_generation" && !event.success).reduce((sum, event) => sum + event.count, 0)} />
            </div>
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-heading text-lg font-bold text-slate-900">Popular destinations</h2>
                <div className="mt-4 space-y-3">
                  {data.popularDestinations.map((item, index) => (
                    <div key={item.destination} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-700">{index + 1}. {item.destination}</span><span className="text-teal-700">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-heading text-lg font-bold text-slate-900">Event totals</h2>
                <div className="mt-4 space-y-3">
                  {data.events.map((event) => (
                    <div key={`${event.type}-${event.success}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-700">{event.type.replaceAll("_", " ")} · {event.success ? "success" : "failed"}</span><span className="text-teal-700">{event.count}</span>
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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{icon}</div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 font-heading text-3xl font-bold text-slate-900">{value}</p></div>;
}
