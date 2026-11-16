export default function ExploreIndiaLoading() {
  return (
    <main
      className="min-h-screen bg-[#080c12] px-5 pb-20 pt-28 text-slate-100"
      aria-busy="true"
      aria-label="Loading India travel discovery"
    >
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-4 h-10 w-80 max-w-full rounded bg-white/10" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-40 rounded-2xl border border-white/10 bg-white/[0.035]"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">
        Loading source-backed destinations and travel themes…
      </span>
    </main>
  );
}
