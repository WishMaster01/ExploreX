"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { exploreTaxonomy } from "@/lib/data/india-explore";

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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const [response, savedResponse] = await Promise.all([
        fetch(
          `/api/discoveries?${new URLSearchParams({ ...(destination ? { destination } : {}), ...(categoryFilter ? { category: categoryFilter } : {}) })}`,
        ),
        fetch("/api/discoveries/saved").catch(() => null),
      ]);
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.discoveries))
        throw new Error(body.error?.message ?? "Discoveries are unavailable.");
      setItems(body.discoveries);
      if (savedResponse?.ok) {
        const savedBody = await savedResponse.json();
        setSavedIds(
          Array.isArray(savedBody.savedDiscoveries)
            ? savedBody.savedDiscoveries.map(
                (item: { id: string }) => item.id,
              )
            : [],
        );
      }
      setLoadState("ready");
      setNotice("");
    } catch (error) {
      setLoadState("error");
      setNotice(
        error instanceof Error
          ? error.message
          : "Discoveries could not be loaded.",
      );
    }
  }, [destination, categoryFilter]);
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
    try {
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
    } catch {
      setNotice(
        "Submission could not reach the service. Your entry was not confirmed; try again.",
      );
    } finally {
      setBusy(false);
    }
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
    setActionBusy(id);
    try {
      const response = await fetch(`/api/discoveries/${id}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      const body = await response.json();
      if (response.ok && (action === "save" || action === "unsave")) {
        setSavedIds((current) =>
          action === "save"
            ? current.includes(id)
              ? current
              : [...current, id]
            : current.filter((savedId) => savedId !== id),
        );
      }
      setNotice(
        response.ok
          ? "Your action was recorded."
          : (body.error?.message ?? "Action failed."),
      );
    } catch {
      setNotice("The action could not reach the service. Please try again.");
    } finally {
      setActionBusy(null);
    }
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
            aria-label="Discovery title"
            placeholder="Title"
            className="rounded border p-3"
          />
          <input
            required
            name="destinationId"
            aria-label="Destination id"
            placeholder="Destination id, e.g. jaipur-in"
            className="rounded border p-3"
          />
          <label className="text-sm font-medium">
            Category
            <select
              required
              name="category"
              aria-label="Category"
              defaultValue=""
              className="mt-1 min-h-11 w-full rounded border p-3"
            >
              <option value="" disabled>
                Choose a travel theme
              </option>
              {exploreTaxonomy.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              {exploreTaxonomy.tags.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <input
            name="locationLabel"
            aria-label="Approximate location"
            placeholder="Approximate location (optional)"
            className="rounded border p-3"
          />
          <textarea
            required
            minLength={20}
            maxLength={2000}
            name="description"
            aria-label="Experience description"
            placeholder="What makes it worthwhile? Avoid sensitive access details."
            className="rounded border p-3 sm:col-span-2"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            name="estimatedCostMinor"
            aria-label="Estimated cost"
            placeholder="Estimated cost"
            className="rounded border p-3"
          />
          <input
            name="currencyCode"
            aria-label="Currency code"
            maxLength={3}
            placeholder="Currency code, e.g. INR"
            className="rounded border p-3"
          />
          <input
            type="number"
            min="1"
            max="10080"
            name="durationMinutes"
            aria-label="Duration in minutes"
            placeholder="Duration in minutes"
            className="rounded border p-3"
          />
          <input
            type="url"
            name="sourceUrl"
            aria-label="Source URL"
            placeholder="Source URL (optional)"
            className="rounded border p-3"
          />
          <textarea
            name="accessRestrictions"
            aria-label="Access restrictions"
            maxLength={1000}
            placeholder="Known access restrictions"
            className="rounded border p-3 sm:col-span-2"
          />
          <input
            name="commercialRelationship"
            aria-label="Commercial relationship"
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
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold">Approved discoveries</h2>
            <p className="text-sm text-muted-foreground">
              Contributor identities and private trips are never shown.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-medium">
              Destination id
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="e.g. jaipur-in"
                aria-label="Filter discoveries by destination id"
                className="mt-1 min-h-10 w-full rounded border p-2"
              />
            </label>
            <label className="text-xs font-medium">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter discoveries by category"
                className="mt-1 min-h-10 w-full rounded border p-2"
              >
                <option value="">All themes</option>
                {exploreTaxonomy.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                {exploreTaxonomy.tags.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Search titles
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search"
                aria-label="Search discovery titles"
                className="mt-1 min-h-10 w-full rounded border p-2"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {loadState === "loading" && (
            <p
              role="status"
              className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
            >
              Loading approved discoveries…
            </p>
          )}
          {loadState === "error" && (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 p-5 text-sm"
            >
              <p>Approved discoveries could not be loaded.</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 min-h-10 rounded border px-3 font-semibold"
              >
                Try again
              </button>
            </div>
          )}
          {items
            .filter(
              (item) =>
                !searchText.trim() ||
                item.title
                  .toLocaleLowerCase()
                  .includes(searchText.trim().toLocaleLowerCase()),
            )
            .map((item) => (
              <article key={item.id} className="rounded-2xl border p-5">
                <p className="text-xs uppercase text-emerald-700">
                  {item.destinationId} · {item.category}
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  <Link
                    href={`/uncovered/${item.id}`}
                    className="underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-2">{item.description}</p>
                {item.sensitiveLocation ? (
                  <p className="mt-3 text-amber-800">
                    Sensitive location: precise location is withheld.
                  </p>
                ) : (
                  item.locationLabel && (
                    <p className="mt-3">
                      Approximate area: {item.locationLabel}
                    </p>
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
                {(item.estimatedCostMinor !== null ||
                  item.durationMinutes !== null) && (
                  <p className="mt-2 text-sm text-slate-600">
                    {item.estimatedCostMinor !== null
                      ? `Estimated cost: ${((item.estimatedCostMinor ?? 0) / 100).toFixed(2)} ${item.currencyCode ?? "currency unavailable"}`
                      : "Cost unavailable"}
                    {item.durationMinutes !== null
                      ? ` · Estimated duration: ${item.durationMinutes} minutes`
                      : ""}
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
                  <button
                    type="button"
                    disabled={actionBusy === item.id}
                    aria-pressed={savedIds.includes(item.id)}
                    onClick={() =>
                      void act(
                        item.id,
                        savedIds.includes(item.id) ? "unsave" : "save",
                      )
                    }
                    className="min-h-10 rounded border px-3 py-2 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    {savedIds.includes(item.id) ? "Remove saved" : "Save"}
                  </button>
                  {["recommend", "visit"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={actionBusy === item.id}
                      onClick={() => void act(item.id, action)}
                      className="min-h-10 rounded border px-3 py-2 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                    >
                      {action === "visit" ? "I visited" : action}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={actionBusy === item.id}
                    onClick={() => void act(item.id, "correction")}
                    className="min-h-10 rounded border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    Request correction
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy === item.id}
                    onClick={() => void act(item.id, "report")}
                    className="min-h-10 rounded border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    Report
                  </button>
                </div>
              </article>
            ))}
        </div>
        {loadState === "ready" &&
          items.filter(
            (item) =>
              !searchText.trim() ||
              item.title
                .toLocaleLowerCase()
                .includes(searchText.trim().toLocaleLowerCase()),
          ).length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed p-6 text-muted-foreground">
              No approved discoveries match this destination yet.
            </p>
          )}
      </section>
    </main>
  );
}
