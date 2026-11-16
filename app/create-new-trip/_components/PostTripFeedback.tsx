"use client";

import { useState } from "react";

export function PostTripFeedback({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("");
  const [writtenFeedback, setWrittenFeedback] = useState("");
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!completed || !rating) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/discoveries/feedback/overall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          overallSatisfaction: Number(rating),
          ...(writtenFeedback.trim()
            ? { writtenFeedback: writtenFeedback.trim() }
            : {}),
          consentToPublish: false,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Feedback could not be saved.");
      setMessage("Thanks. Your private feedback was saved.");
      setOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Feedback could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-xs font-semibold text-orange-200 underline underline-offset-4"
      >
        Share optional post-trip feedback
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3"
        >
          <p className="text-xs leading-5 text-slate-300">
            Only submit after completing this trip. Your feedback remains
            private and is not published.
          </p>
          <label className="block text-xs font-medium text-slate-200">
            Overall satisfaction
            <select
              required
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200"
            >
              <option value="">Choose a rating</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} of 5
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-200">
            Optional comments
            <textarea
              maxLength={1000}
              value={writtenFeedback}
              onChange={(event) => setWrittenFeedback(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input
              required
              type="checkbox"
              checked={completed}
              onChange={(event) => setCompleted(event.target.checked)}
              className="mt-0.5 accent-orange-300"
            />
            I confirm that I completed this trip.
          </label>
          <button
            disabled={busy || !rating || !completed}
            className="min-h-10 rounded-lg bg-orange-200 px-4 text-xs font-bold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Submit private feedback"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs text-slate-300">
          {message}
        </p>
      )}
    </section>
  );
}
