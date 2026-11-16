"use client";

import { useEffect, useState } from "react";

type PublicTrip = {
  destination: string;
  duration: string | null;
  days: {
    day: number;
    title: string;
    activities: {
      name: string;
      details: string;
      start: string | null;
      end: string | null;
      durationMinutes: number | null;
    }[];
  }[];
};

export function SharedTrip({ token }: { token: string }) {
  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    void fetch(`/api/shared-trips/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.destination) throw new Error("Unavailable");
        return body as PublicTrip;
      })
      .then((data) => {
        if (active) {
          setTrip(data);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [token]);
  if (state === "loading")
    return (
      <main
        className="min-h-screen bg-[#080c12] px-5 pt-32 text-white"
        aria-busy="true"
      >
        <p role="status">Loading shared itinerary…</p>
      </main>
    );
  if (state === "error" || !trip)
    return (
      <main className="min-h-screen bg-[#080c12] px-5 pt-32 text-white">
        <section
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-amber-200/20 p-6"
        >
          <h1 className="text-xl font-semibold">
            This shared itinerary is unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            The link may have been revoked or expired.
          </p>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-16 pt-28 text-white sm:px-8">
      <article className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-200">
          Shared ExploreX itinerary
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{trip.destination}</h1>
        {trip.duration && (
          <p className="mt-2 text-slate-300">{trip.duration}</p>
        )}
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          This link shows itinerary activities only. Budget, origin, group
          details, account information, lodging, and contact details are not
          included. Activity details and prices may be unverified.
        </p>
        <div className="mt-8 space-y-5">
          {trip.days.map((day) => (
            <section
              key={day.day}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <h2 className="text-xl font-semibold">
                Day {day.day}: {day.title}
              </h2>
              <ol className="mt-4 space-y-3">
                {day.activities.map((activity, index) => (
                  <li
                    key={`${day.day}-${index}`}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <h3 className="font-medium">{activity.name}</h3>
                    {(activity.start || activity.end) && (
                      <p className="mt-1 text-xs text-orange-100">
                        {activity.start ?? "Time not set"}
                        {activity.end ? `–${activity.end}` : ""} · estimate
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {activity.details}
                    </p>
                    {activity.durationMinutes && (
                      <p className="mt-2 text-xs text-slate-400">
                        Visit estimate: {activity.durationMinutes} minutes
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
