import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findExploreCategory,
  getJaipurCategoryPlaces,
  hasJaipurCategory,
} from "@/lib/data/india-explore";
import { loadTravelDataset } from "@/lib/data/travel-datasets.server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: id } = await params;
  const category = findExploreCategory(id);
  const hasSourceBackedItems = category
    ? getJaipurCategoryPlaces(category).length > 0
    : false;
  return {
    title: category
      ? `${category.name} in India | ExploreX`
      : "Travel theme | ExploreX",
    robots: { index: hasSourceBackedItems, follow: hasSourceBackedItems },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: id } = await params;
  const category = findExploreCategory(id);
  if (!category) notFound();
  const matchingPlaces = getJaipurCategoryPlaces(category);
  let datasetAvailable = false;
  try {
    datasetAvailable = Boolean(await loadTravelDataset("jaipur-in"));
  } catch {
    datasetAvailable = false;
  }
  const showJaipur =
    datasetAvailable &&
    (matchingPlaces.length > 0 || hasJaipurCategory(category));
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-20 pt-28 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/explore-india"
          className="text-sm text-orange-200 hover:text-orange-100"
        >
          ← All India themes
        </Link>
        <p className="mt-8 text-sm font-medium text-orange-200">
          Explore India · Taxonomy {"1.0.0"}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{category.name}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-300">
          {category.description}
        </p>
        {showJaipur ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Jaipur, Rajasthan</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Verified destination · {matchingPlaces.length} source-backed
                  matching places
                </p>
              </div>
              <Link
                className="text-sm text-orange-200 underline underline-offset-4"
                href="/explore-india/destinations/jaipur-in"
              >
                Destination details
              </Link>
            </div>
            {matchingPlaces.length ? (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {matchingPlaces.map((place) => (
                  <li
                    key={place.id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <p className="font-medium">{place.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Source checked · See destination provenance
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                role="status"
                className="mt-6 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm leading-6 text-slate-300"
              >
                Jaipur is tagged for this travel theme, but no source-backed
                individual experiences are listed here yet.
              </p>
            )}
          </section>
        ) : (
          <section
            role="status"
            className="mt-10 rounded-2xl border border-amber-200/20 bg-amber-200/5 p-6"
          >
            <h2 className="font-semibold text-amber-100">
              No source-backed destination records yet
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              This travel theme is available for browsing, but no destinations
              or experiences currently pass the source and data checks for it.
              We will show results here when reviewed data is available.
            </p>
          </section>
        )}
        <Link
          href="/create-new-trip"
          className="mt-8 inline-flex rounded-xl bg-orange-200 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-100"
        >
          Plan a trip around this theme
        </Link>
      </div>
    </main>
  );
}
