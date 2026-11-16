import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, ShieldCheck } from "lucide-react";
import {
  exploreTaxonomy,
  findExploreCategory,
  hasJaipurCategory,
} from "@/lib/data/india-explore";
import { loadTravelDataset } from "@/lib/data/travel-datasets.server";
import rawManifest from "@/data/destinations/jaipur-in/manifest.json";

export const metadata: Metadata = {
  title: "Explore India | ExploreX",
  description:
    "Plan thoughtful trips across India with source-backed destination information and an editable itinerary planner.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  let jaipur: Awaited<ReturnType<typeof loadTravelDataset>> = null;
  try {
    jaipur = await loadTravelDataset("jaipur-in");
  } catch {
    // The page keeps an honest degraded state if the curated dataset fails validation.
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080c12] pb-20 pt-24 text-slate-100">
      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:px-12">
        <div className="pointer-events-none absolute -right-28 top-4 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-200/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
            <Compass className="size-4" aria-hidden="true" /> Explore India,
            thoughtfully
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            A more considered way to see{" "}
            <span className="text-orange-200">India.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Discover places by the way you want to travel, check where
            information comes from, then shape an itinerary around your own
            pace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/explore-india"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-200 px-6 font-semibold text-slate-950 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-200"
            >
              Explore India <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/create-new-trip"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 font-semibold text-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Plan a trip
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Destination records are shown only when they have passed source and
            schema checks.
          </p>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12"
        aria-labelledby="travel-themes"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-200">
              Find your kind of India
            </p>
            <h2
              id="travel-themes"
              className="mt-2 text-2xl font-semibold sm:text-3xl"
            >
              Explore by travel style
            </h2>
          </div>
          <Link
            href="/explore-india"
            className="text-sm font-medium text-slate-300 underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            Browse all themes
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {exploreTaxonomy.categories.map((category) => {
            const hasCoverage = hasJaipurCategory(
              findExploreCategory(category.id)!,
            );
            return (
              <Link
                key={category.id}
                href={`/explore-india/categories/${category.id}`}
                className="group min-h-32 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-orange-200/40 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:p-5"
              >
                <span className="text-sm font-semibold text-white sm:text-base">
                  {category.name}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-400">
                  {category.description}
                </span>
                <span className="mt-3 block text-[11px] text-slate-500">
                  {hasCoverage
                    ? "Verified destination available"
                    : "No verified destination records yet"}
                </span>
              </Link>
            );
          })}
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          aria-label="Additional travel interests"
        >
          {exploreTaxonomy.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/explore-india/categories/${tag.id}`}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-orange-200/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12"
        aria-labelledby="source-backed"
      >
        <div className="mb-7">
          <p className="text-sm font-medium text-orange-200">
            Source-backed destination
          </p>
          <h2
            id="source-backed"
            className="mt-2 text-2xl font-semibold sm:text-3xl"
          >
            Start with what we can verify
          </h2>
        </div>
        {jaipur ? (
          <article className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#111821] md:grid-cols-[1.2fr_1fr]">
            <div className="flex min-h-64 flex-col justify-between bg-gradient-to-br from-orange-900/50 via-rose-950/30 to-[#111821] p-7 sm:p-10">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Verified
                  destination
                </span>
                <h3 className="mt-5 text-4xl font-semibold">
                  {jaipur.catalog.destination.name}
                </h3>
                <p className="mt-2 text-slate-300">
                  {jaipur.catalog.destination.state},{" "}
                  {jaipur.catalog.destination.country}
                </p>
              </div>
              <Link
                href="/explore-india/destinations/jaipur-in"
                className="mt-8 inline-flex w-fit items-center gap-2 font-semibold text-orange-200 hover:text-orange-100"
              >
                View destination details{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="p-7 sm:p-10">
              <p className="text-sm text-slate-300">
                Currently checked records
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {jaipur.catalog.places.length} places
              </p>
              <ul className="mt-5 space-y-3">
                {jaipur.catalog.places.slice(0, 3).map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center gap-3 text-sm text-slate-200"
                  >
                    <MapPin
                      className="size-4 shrink-0 text-orange-200"
                      aria-hidden="true"
                    />
                    {place.name}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
                Attraction names are attributed to Rajasthan Tourism. The data
                does not include verified opening times, prices, restaurants,
                hotels, or on-site coordinates.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Last verified:{" "}
                {jaipur.catalog.destination.lastVerifiedAt ??
                  "Date not supplied"}{" "}
                · Source:{" "}
                {jaipur.catalog.destination.provenance.attribution ??
                  "Not supplied"}
              </p>
            </div>
          </article>
        ) : (
          <div
            role="status"
            className="rounded-2xl border border-amber-200/20 bg-amber-200/5 p-6 text-sm leading-6 text-amber-100"
          >
            Verified destination information is temporarily unavailable. You can
            still use the trip planner, but we will not substitute demo places
            for live data.
          </div>
        )}
        <p className="sr-only">
          Dataset manifest generated at {rawManifest.generatedAt}; coverage
          status {rawManifest.coverageStatus}.
        </p>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12"
        aria-labelledby="plan-journey"
      >
        <div className="flex flex-col justify-between gap-5 rounded-3xl border border-orange-200/15 bg-orange-200/[0.045] p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="text-sm font-medium text-orange-200">
              Your trip, your choices
            </p>
            <h2 id="plan-journey" className="mt-2 text-2xl font-semibold">
              Build an itinerary you can edit
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Tell the planner your dates, interests, pace, and budget.
              Suggestions and estimated costs are identified separately from
              confirmed information.
            </p>
          </div>
          <Link
            href="/create-new-trip"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-slate-950 hover:bg-slate-200"
          >
            Start planning <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
