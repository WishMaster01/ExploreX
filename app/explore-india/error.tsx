"use client";

export default function ExploreIndiaError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] bg-[#080c12] px-5 py-32 text-slate-100">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-2xl border border-amber-200/20 bg-amber-200/5 p-6"
      >
        <h1 className="text-xl font-semibold">
          India discovery is temporarily unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          The destination data could not be loaded. Please retry, or continue to
          the trip planner.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="min-h-11 rounded-lg bg-orange-200 px-4 font-semibold text-slate-950"
          >
            Try again
          </button>
          <a
            href="/create-new-trip"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 font-semibold"
          >
            Open trip planner
          </a>
        </div>
      </section>
    </main>
  );
}
