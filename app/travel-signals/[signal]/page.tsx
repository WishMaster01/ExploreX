import { getTravelSignal, travelSignals } from "@/lib/data/travel-signals";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SignalPageProps = { params: Promise<{ signal: string }> };
export function generateStaticParams() { return travelSignals.map((signal) => ({ signal: signal.slug })); }

export default async function TravelSignalPage({ params }: SignalPageProps) {
  const signal = getTravelSignal((await params).signal);
  if (!signal) notFound();
  return <div className="min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"><ArrowLeft className="size-4" /> Back home</Link><p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Travel Signals</p><h1 className="mt-2 font-display text-4xl font-bold text-slate-900 sm:text-5xl">{signal.title}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{signal.summary}</p><div className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><AlertTriangle className="mt-0.5 size-5 shrink-0" />{signal.disclaimer}</div><div className="mt-10 grid gap-6 md:grid-cols-2">{signal.sections.map((section) => <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-heading text-xl font-bold text-slate-900">{section.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p><ul className="mt-5 space-y-3">{section.points.map((point) => <li key={point} className="flex gap-3 text-sm text-slate-700"><CheckCircle2 className="size-5 shrink-0 text-teal-600" />{point}</li>)}</ul></section>)}</div></div></div>;
}
