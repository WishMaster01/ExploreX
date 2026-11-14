"use client";
import { useCallback, useEffect, useState } from "react";

type Discovery = {
  id: string;
  title: string;
  description: string;
  destinationId: string;
  category: string;
  locationLabel: string | null;
  estimatedCostMinor: number | null;
  currencyCode: string | null;
  durationMinutes: number | null;
  accessRestrictions: string | null;
  sensitiveLocation: boolean;
  commercialRelationship: string | null;
  trustSignals: {
    communityCorroborated: boolean;
    visitReported: boolean;
    sourceCorroborated: boolean;
    visitEvidenceSupplied: boolean;
    moderatorReviewed: boolean;
  };
};

export function CommunityDiscoveries() {
  const [items, setItems] = useState<Discovery[]>([]);
  const [notice, setNotice] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(
      `/api/discoveries${destination ? `?destination=${encodeURIComponent(destination)}` : ""}`,
    );
    const body = await response.json();
    if (response.ok) setItems(body.discoveries);
    else setNotice(body.error?.message ?? "Discoveries are unavailable.");
  }, [destination]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const raw = Object.fromEntries(values.entries());
    for (const key of [
      "locationLabel",
      "currencyCode",
      "sourceUrl",
      "accessRestrictions",
      "commercialRelationship",
    ])
      if (!raw[key]) delete raw[key];
    if (typeof raw.currencyCode === "string")
      raw.currencyCode = raw.currencyCode.toUpperCase();
    const response = await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...raw,
        sensitiveLocation: values.get("sensitiveLocation") === "on",
        consentToPublish: values.get("consentToPublish") === "on",
        estimatedCostMinor: raw.estimatedCostMinor
          ? Math.round(Number(raw.estimatedCostMinor) * 100)
          : undefined,
        durationMinutes: raw.durationMinutes
          ? Number(raw.durationMinutes)
          : undefined,
      }),
    });
    const body = await response.json();
    setNotice(
      response.ok
        ? "Submitted for moderator review. It stays private until approved."
        : (body.error?.message ?? "Submission failed."),
    );
    if (response.ok) form.reset();
    setBusy(false);
  }
  async function act(id: string, action: string) {
    const reason =
      action === "report" || action === "correction"
        ? (window.prompt(
            action === "report"
              ? "What should moderators review?"
              : "What correction would help?",
          ) ?? "")
        : undefined;
    if (action === "report" || action === "correction") {
      if (!reason || reason.length < 5) return;
    }
    const response = await fetch(`/api/discoveries/${id}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
    });
    const body = await response.json();
    setNotice(
      response.ok
        ? "Your action was recorded."
        : (body.error?.message ?? "Action failed."),
    );
  }
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          ExploreX Uncovered
        </p>
        <h1 className="mt-2 text-4xl font-bold">
          Local discoveries, shared carefully
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Submissions are reviewed before publication. Community recommendations
          and visit reports are signals, not proof.
        </p>
      </header>
      {notice && (
        <p role="status" className="rounded-lg bg-muted p-3">
          {notice}
        </p>
      )}
      <section className="rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">Recommend an experience</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            required
            minLength={3}
            maxLength={120}
            name="title"
            placeholder="Title"
            className="rounded border p-3"
          />
          <input
            required
            name="destinationId"
            placeholder="Destination id, e.g. jaipur-in"
            className="rounded border p-3"
          />
          <input
            required
            name="category"
            placeholder="Category"
            className="rounded border p-3"
          />
          <input
            name="locationLabel"
            placeholder="Approximate location (optional)"
            className="rounded border p-3"
          />
          <textarea
            required
            minLength={20}
            maxLength={2000}
            name="description"
            placeholder="What makes it worthwhile? Avoid sensitive access details."
            className="rounded border p-3 sm:col-span-2"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            name="estimatedCostMinor"
            placeholder="Estimated cost"
            className="rounded border p-3"
          />
          <input
            name="currencyCode"
            maxLength={3}
            placeholder="Currency code, e.g. INR"
            className="rounded border p-3"
          />
          <input
            type="number"
            min="1"
            max="10080"
            name="durationMinutes"
            placeholder="Duration in minutes"
            className="rounded border p-3"
          />
          <input
            type="url"
            name="sourceUrl"
            placeholder="Source URL (optional)"
            className="rounded border p-3"
          />
          <textarea
            name="accessRestrictions"
            maxLength={1000}
            placeholder="Known access restrictions"
            className="rounded border p-3 sm:col-span-2"
          />
          <input
            name="commercialRelationship"
            maxLength={200}
            placeholder="Business relationship, if any"
            className="rounded border p-3 sm:col-span-2"
          />
          <label className="flex gap-2">
            <input type="checkbox" name="sensitiveLocation" /> Sensitive place
          </label>
          <label className="flex gap-2 sm:col-span-2">
            <input required type="checkbox" name="consentToPublish" /> I have
            permission to submit these details for public display after review.
          </label>
          <button
            disabled={busy}
            className="rounded bg-emerald-700 px-4 py-3 font-semibold text-white sm:col-span-2"
          >
            {busy ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </section>
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Approved discoveries</h2>
            <p className="text-sm text-muted-foreground">
              Contributor identities and private trips are never shown.
            </p>
          </div>
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Filter destination id"
            className="rounded border p-2"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border p-5">
              <p className="text-xs uppercase text-emerald-700">
                {item.destinationId} · {item.category}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2">{item.description}</p>
              {item.sensitiveLocation ? (
                <p className="mt-3 text-amber-800">
                  Sensitive location: precise location is withheld.
                </p>
              ) : (
                item.locationLabel && (
                  <p className="mt-3">Approximate area: {item.locationLabel}</p>
                )
              )}
              {item.accessRestrictions && (
                <p className="mt-2">Access: {item.accessRestrictions}</p>
              )}
              {item.commercialRelationship && (
                <p className="mt-2 font-medium">
                  Business relationship: {item.commercialRelationship}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Community submitted
                {item.trustSignals.sourceCorroborated
                  ? " · Source corroborated"
                  : ""}
                {item.trustSignals.moderatorReviewed
                  ? " · Moderator reviewed"
                  : ""}
                {item.trustSignals.communityCorroborated
                  ? " · Community corroborated"
                  : ""}
                {item.trustSignals.visitReported
                  ? " · Visit reported (not independently verified)"
                  : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["save", "recommend", "visit"].map((action) => (
                  <button
                    key={action}
                    onClick={() => void act(item.id, action)}
                    className="rounded border px-3 py-2 capitalize"
                  >
                    {action === "visit" ? "I visited" : action}
                  </button>
                ))}
                <button
                  onClick={() => void act(item.id, "correction")}
                  className="rounded border px-3 py-2"
                >
                  Request correction
                </button>
                <button
                  onClick={() => void act(item.id, "report")}
                  className="rounded border px-3 py-2"
                >
                  Report
                </button>
              </div>
            </article>
          ))}
        </div>
        {items.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-muted-foreground">
            No approved discoveries match this destination yet.
          </p>
        )}
      </section>
    </main>
  );
}
