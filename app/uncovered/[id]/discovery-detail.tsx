"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DiscoveryDetailData = {
  id: string;
  title: string;
  description: string;
  destinationId: string;
  category: string;
  locationLabel?: string | null;
  sensitiveLocation: boolean;
  estimatedCostMinor?: number | null;
  currencyCode?: string | null;
  durationMinutes?: number | null;
  accessRestrictions?: string | null;
  sourceUrl?: string | null;
  commercialRelationship?: string | null;
  savedCount: number;
  trustSignals: {
    communitySubmitted: boolean;
    sourceCorroborated: boolean;
    communityCorroborated: boolean;
    visitReported: boolean;
    visitEvidenceSupplied: boolean;
    moderatorReviewed: boolean;
  };
};

export function DiscoveryDetail({ id }: { id: string }) {
  const [item, setItem] = useState<DiscoveryDetailData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/discoveries/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.id) throw new Error("Unavailable");
        return body as DiscoveryDetailData;
      })
      .then((data) => {
        if (active) {
          setItem(data);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function act(
    action: "save" | "recommend" | "visit" | "report" | "correction",
  ) {
    let reason: string | undefined;
    if (action === "report" || action === "correction") {
      reason =
        window.prompt(
          action === "report"
            ? "What should moderators review?"
            : "What correction would help?",
        ) ?? undefined;
      if (!reason || reason.trim().length < 5) return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/discoveries/${id}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Action could not be recorded.");
      setMessage("Your action was recorded.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Action could not be recorded.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (state === "loading")
    return (
      <main
        className="min-h-[70vh] bg-[#080c12] px-5 pt-32 text-white"
        aria-busy="true"
      >
        <p role="status">Loading discovery…</p>
      </main>
    );
  if (state === "error" || !item)
    return (
      <main className="min-h-[70vh] bg-[#080c12] px-5 pt-32 text-white">
        <section
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-amber-200/20 p-6"
        >
          <h1 className="text-xl font-semibold">Discovery is unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">
            It may be awaiting review, removed, or temporarily unavailable.
          </p>
          <Link
            href="/uncovered"
            className="mt-4 inline-flex min-h-10 items-center rounded-lg border px-4"
          >
            Back to discoveries
          </Link>
        </section>
      </main>
    );
  const signals = [
    item.trustSignals.communitySubmitted && "Community submitted",
    item.trustSignals.sourceCorroborated && "Source corroborated",
    item.trustSignals.moderatorReviewed && "Moderator reviewed",
    item.trustSignals.communityCorroborated && "Community corroborated",
    item.trustSignals.visitReported && "Visit reported (not proof of quality)",
  ].filter((signal): signal is string => Boolean(signal));
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-16 pt-28 text-white sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/uncovered"
          className="text-sm text-orange-200 underline underline-offset-4"
        >
          ← All discoveries
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-emerald-200">
          {item.destinationId} · {item.category}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{item.title}</h1>
        <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-200">
          {item.description}
        </p>
        <section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="font-semibold">Details and uncertainty</h2>
          {item.sensitiveLocation ? (
            <p className="mt-3 text-sm text-amber-100">
              Sensitive place: precise location is withheld.
            </p>
          ) : (
            item.locationLabel && (
              <p className="mt-3 text-sm text-slate-300">
                Approximate area: {item.locationLabel}
              </p>
            )
          )}
          {item.accessRestrictions && (
            <p className="mt-3 text-sm text-slate-300">
              Access restrictions: {item.accessRestrictions}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-300">
            {item.estimatedCostMinor !== null &&
            item.estimatedCostMinor !== undefined
              ? `Estimated cost: ${(item.estimatedCostMinor / 100).toFixed(2)} ${item.currencyCode ?? "currency unavailable"}`
              : "Price not supplied"}
            {item.durationMinutes
              ? ` · Estimated duration: ${item.durationMinutes} minutes`
              : ""}
          </p>
          {item.commercialRelationship && (
            <p className="mt-3 text-sm text-slate-300">
              Business relationship: {item.commercialRelationship}
            </p>
          )}
          {item.sourceUrl && (
            <p className="mt-3">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-orange-200 underline underline-offset-4"
              >
                Contributor supplied source ↗
              </a>
            </p>
          )}
          <ul className="mt-4 flex flex-wrap gap-2">
            {signals.map((signal) => (
              <li
                key={signal}
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-slate-300"
              >
                {signal}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Trust signals are distinct and do not independently establish that
            an experience is genuine or high quality.
          </p>
        </section>
        <section
          className="mt-5 flex flex-wrap gap-2"
          aria-label="Discovery actions"
        >
          {(
            ["save", "recommend", "visit", "correction", "report"] as const
          ).map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => void act(action)}
              className="min-h-10 rounded-lg border border-white/15 px-4 text-sm capitalize hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200 disabled:opacity-50"
            >
              {action === "visit"
                ? "I visited"
                : action === "correction"
                  ? "Request correction"
                  : action}
            </button>
          ))}
        </section>
        {message && (
          <p role="status" className="mt-3 text-sm text-slate-300">
            {message}
          </p>
        )}
      </article>
    </main>
  );
}
