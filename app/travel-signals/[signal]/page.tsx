import { getTravelSignal, travelSignals } from "@/lib/data/travel-signals";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import type { TravelSignal } from "@/lib/data/travel-signals";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type SignalPageProps = { params: Promise<{ signal: string }> };

export function generateStaticParams() {
  return travelSignals.map((signal) => ({ signal: signal.slug }));
}

export async function generateMetadata({
  params,
}: SignalPageProps): Promise<Metadata> {
  const { signal: slug } = await params;
  const signals = await loadSiteDataset<TravelSignal[]>(
    "travel-signals",
    travelSignals,
  );
  const signal =
    signals.find((item) => item.slug === slug) ?? getTravelSignal(slug);
  if (!signal) return {};
  return {
    title: `${signal.title} | ExploreX Travel Signals`,
    description: signal.summary,
    alternates: {
      canonical: `/travel-signals/${encodeURIComponent(signal.slug)}`,
    },
  };
}

export default async function TravelSignalPage({ params }: SignalPageProps) {
  const { signal: slug } = await params;
  const signals = await loadSiteDataset<TravelSignal[]>(
    "travel-signals",
    travelSignals,
  );
  const signal =
    signals.find((item) => item.slug === slug) ?? getTravelSignal(slug);
  if (!signal) notFound();

  return (
    <div className="min-h-screen bg-[#070b14] text-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur transition hover:border-teal-400 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back Home
        </Link>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <ShieldAlert className="size-3.5" />
          Travel Signals
        </div>

        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
          {signal.title}
        </h1>

        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          {signal.summary}
        </p>

        <div className="mt-8 flex gap-3.5 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs sm:text-sm leading-relaxed text-amber-200 backdrop-blur-xl">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <p>{signal.disclaimer}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {signal.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl"
            >
              <h2 className="font-heading text-lg font-bold text-white">
                {section.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {section.description}
              </p>
              <ul className="mt-5 space-y-3">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-xs leading-relaxed text-slate-200"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-teal-400 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {signal.sourceUrl && (
          <p className="mt-8 text-xs leading-6 text-slate-400">
            Health guidance reviewed against{" "}
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-teal-300 underline decoration-teal-300/40 underline-offset-4 hover:text-teal-200"
            >
              {signal.sourceLabel ?? "the source guidance"}
            </a>
            . Check the latest official advice before travel.
          </p>
        )}
      </div>
    </div>
  );
}
