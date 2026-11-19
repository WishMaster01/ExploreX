"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SavedDiscovery = {
  id: string;
  title: string;
  description: string;
  destinationId: string;
  category: string;
  locationLabel: string | null;
  sensitiveLocation: boolean;
  commercialRelationship: string | null;
  savedAt: string;
};

export function SavedPlaces() {
  const [items, setItems] = useState<SavedDiscovery[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "error" | "unauthenticated"
  >("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/discoveries/saved");
      const body = await response.json();
      if (response.status === 401) {
        setState("unauthenticated");
        return;
      }
      if (!response.ok || !Array.isArray(body.savedDiscoveries))
        throw new Error("Saved places are unavailable.");
      setItems(body.savedDiscoveries);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function remove(id: string) {
    try {
      const response = await fetch(
        `/api/discoveries/${encodeURIComponent(id)}/signals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsave" }),
        },
      );
      if (!response.ok) throw new Error();
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setState("error");
    }
  }
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-16 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-orange-200">Your collection</p>
        <h1 className="mt-2 text-4xl font-semibold">Saved places</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Approved community discoveries you saved. Sensitive locations remain
          generalized, and a community submission is not a quality guarantee.
        </p>
        {state === "loading" && (
          <p
            role="status"
            className="mt-8 rounded-xl border border-white/10 p-5"
          >
            Loading saved places…
          </p>
        )}
        {state === "unauthenticated" && (
          <div className="mt-8 rounded-xl border border-white/10 p-5 text-sm">
            Sign in to see saved places.{" "}
            <Link href="/sign-in" className="text-orange-200 underline">
              Sign in
            </Link>
          </div>
        )}
        {state === "error" && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-amber-200/20 p-5"
          >
            <p>Saved places could not be loaded or updated.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 min-h-10 rounded-lg border px-4"
            >
              Try again
            </button>
          </div>
        )}
        {state === "ready" && items.length === 0 && (
          <p className="mt-8 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-300">
            You have no saved approved discoveries yet. Browse{" "}
            <Link className="text-orange-200 underline" href="/uncovered">
              ExploreX Uncovered
            </Link>
            .
          </p>
        )}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <p className="text-xs uppercase text-emerald-200">
                {item.destinationId} · {item.category}
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                <Link
                  href={`/uncovered/${item.id}`}
                  className="underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-orange-200"
                >
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {item.description}
              </p>
              {item.sensitiveLocation ? (
                <p className="mt-3 text-xs text-amber-100">
                  Sensitive location: precise location withheld.
                </p>
              ) : (
                item.locationLabel && (
                  <p className="mt-3 text-xs text-slate-400">
                    Approximate area: {item.locationLabel}
                  </p>
                )
              )}
              {item.commercialRelationship && (
                <p className="mt-3 text-xs text-slate-300">
                  Business relationship: {item.commercialRelationship}
                </p>
              )}
              <button
                type="button"
                onClick={() => void remove(item.id)}
                className="mt-4 min-h-10 rounded-lg border border-white/15 px-3 text-xs focus-visible:outline-2 focus-visible:outline-orange-200"
              >
                Remove saved place
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
