import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/lib/data/destinations";
import { exploreTaxonomy } from "@/lib/data/india-explore";
import {
  findExploreCategory,
  hasJaipurCategory,
} from "@/lib/data/india-explore";
import { loadTravelDataset } from "@/lib/data/travel-datasets.server";

export const metadata: Metadata = {
  title: "Explore India | ExploreX",
  description: "Browse India travel themes and source-checked destinations.",
};

export default async function ExploreIndiaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLocaleLowerCase();
  const filteredDestinations = DESTINATIONS.filter(
    (item) =>
      item.countryCode === "IN" &&
      item.id === "jaipur-in" &&
      (!query ||
        [item.city, item.state ?? "", ...item.aliases].some((value) =>
          value.toLocaleLowerCase().includes(query),
        )),
  );
  let hasJaipur = false;
  try {
    hasJaipur = Boolean(await loadTravelDataset("jaipur-in"));
  } catch {
    hasJaipur = false;
  }
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-20 pt-28 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-medium text-orange-200">Explore India</p>
        <h1 className="mt-2 text-4xl font-semibold">Choose a way to travel</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Themes come from the travel taxonomy. A category only lists
          destinations when its records have source and schema validation.
        </p>
        <form action="/explore-india" className="mt-7 flex max-w-xl gap-2">
          <label htmlFor="destination-search" className="sr-only">
            Search source-backed destinations
          </label>
          <input
            id="destination-search"
            name="q"
            defaultValue={q}
            placeholder="Search verified destinations"
            className="min-h-11 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200"
          />
          <button className="min-h-11 rounded-lg bg-orange-200 px-5 font-semibold text-slate-950">
            Search
          </button>
        </form>
        <h2 className="mt-10 text-xl font-semibold">
          Source-backed destinations
        </h2>
        {filteredDestinations.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filteredDestinations.map((item) => (
              <Link
                key={item.id}
                href={`/explore-india/destinations/${item.id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 hover:border-orange-200/40"
              >
                <h3 className="text-xl font-semibold">
                  {item.city}, {item.state}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Checked destination record · details and coverage
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p
            role="status"
            className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 p-5 text-sm text-slate-300"
          >
            No source-backed destination matches “{q}”. Other catalog entries
            are not listed until their records pass review.
          </p>
        )}
        <h2 className="mt-12 text-xl font-semibold">Travel themes</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exploreTaxonomy.categories.map((category) => {
            const supported =
              hasJaipur && hasJaipurCategory(findExploreCategory(category.id)!);
            return (
              <Link
                key={category.id}
                href={`/explore-india/categories/${category.id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 hover:border-orange-200/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-200"
              >
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {category.description}
                </p>
                <p className="mt-5 text-xs text-slate-500">
                  {supported
                    ? "Source-backed destination tagged"
                    : "No verified destination records yet"}
                </p>
              </Link>
            );
          })}
        </div>
        <h2 className="mt-12 text-xl font-semibold">More interests</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {exploreTaxonomy.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/explore-india/categories/${tag.id}`}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
