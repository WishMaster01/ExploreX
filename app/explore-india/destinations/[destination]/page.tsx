import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DESTINATIONS } from "@/lib/data/destinations";
import { loadTravelDataset } from "@/lib/data/travel-datasets.server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>;
}): Promise<Metadata> {
  const { destination } = await params;
  const record = DESTINATIONS.find(({ id }) => id === destination);
  return {
    title: record
      ? `${record.city}, ${record.country} | ExploreX`
      : "Destination | ExploreX",
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ destination: string }>;
}) {
  const { destination: id } = await params;
  const entry = DESTINATIONS.find(
    (item) => item.id === id && item.countryCode === "IN",
  );
  if (!entry) notFound();
  let data: Awaited<ReturnType<typeof loadTravelDataset>> = null;
  try {
    data = await loadTravelDataset(id);
  } catch {
    notFound();
  }
  if (!data) notFound();
  const { catalog, sources, manifest } = data;
  const sourceById = new Map(
    sources.sources.map((source) => [source.id, source]),
  );
  const sourceNames = [
    ...new Set(catalog.places.flatMap((place) => place.sourceRefs)),
  ]
    .map((ref) => sourceById.get(ref))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  return (
    <main className="min-h-screen bg-[#080c12] px-5 pb-20 pt-28 text-slate-100 sm:px-8 lg:px-12">
      <article className="mx-auto max-w-5xl">
        <Link
          href="/explore-india"
          className="text-sm text-orange-200 hover:text-orange-100"
        >
          ← Explore India
        </Link>
        <header className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-orange-950/60 to-[#111821] p-7 sm:p-10">
          <p className="text-sm font-medium text-emerald-200">
            Source-checked destination · {catalog.destination.state}
          </p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
            {catalog.destination.name}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            Available information reflects the cited dataset only. Check current
            local guidance before travel.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Last verified{" "}
            {catalog.destination.lastVerifiedAt ?? "date unavailable"} · Dataset
            coverage: {manifest.coverageStatus} · Coordinates identify the city
            center.
          </p>
        </header>
        <section className="mt-10" aria-labelledby="places-heading">
          <h2 id="places-heading" className="text-2xl font-semibold">
            Places with checked names
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            The dataset does not include precise attraction coordinates, opening
            hours, or visit prices.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {catalog.places.map((place) => (
              <li
                key={place.id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <h3 className="font-semibold">{place.name}</h3>
                <p className="mt-2 text-xs text-emerald-200">
                  {place.verificationStatus === "VERIFIED"
                    ? "Source verified"
                    : "Review status: " + place.verificationStatus}
                </p>
                <ul className="mt-3 space-y-1">
                  {place.sourceRefs.map((ref) => {
                    const source = sourceById.get(ref);
                    return source ? (
                      <li key={ref}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-400 underline underline-offset-4 hover:text-white"
                        >
                          {source.attribution} ↗
                        </a>
                      </li>
                    ) : null;
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {(
            [
              "restaurants",
              "hotels",
              "experiences",
              "events",
              "routes",
            ] as const
          ).map((kind) => (
            <div key={kind} className="rounded-2xl border border-white/10 p-5">
              <h2 className="font-semibold capitalize">{kind}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {catalog[kind].length
                  ? `${catalog[kind].length} checked records`
                  : `No source-backed ${kind} records in this dataset yet.`}
              </p>
            </div>
          ))}
        </section>
        <section className="mt-10 rounded-2xl border border-white/10 p-5">
          <h2 className="font-semibold">Data provenance</h2>
          <p className="mt-2 text-sm text-slate-300">
            Dataset generated{" "}
            {new Date(manifest.generatedAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
            . Each place links to its source; only factual names and destination
            context are stored.
          </p>
          <ul className="mt-4 space-y-2">
            {sourceNames.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-orange-200 underline underline-offset-4 hover:text-orange-100"
                >
                  {source.attribution} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
        <Link
          href={`/create-new-trip?destination=${encodeURIComponent(catalog.destination.name)}`}
          className="mt-8 inline-flex rounded-xl bg-orange-200 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-100"
        >
          Plan a trip to {catalog.destination.name}
        </Link>
      </article>
    </main>
  );
}
