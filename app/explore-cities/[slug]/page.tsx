import { getExploreCity, exploreCities } from "@/lib/data/cities";
import { ArrowLeft, CalendarDays, Clock3, Languages, MapPin, ShieldCheck, Train, Wallet2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type CityPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return exploreCities.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const city = getExploreCity((await params).slug);
  return city ? { title: `${city.name} Travel Guide | ExploreX`, description: city.summary } : {};
}

export default async function CityDetailPage({ params }: CityPageProps) {
  const city = getExploreCity((await params).slug);
  if (!city) notFound();

  return (
    <div className="min-h-screen pb-20 pt-[4.25rem]">
      <section className="relative min-h-[28rem] overflow-hidden">
        <Image src={city.image} alt={`${city.name}, ${city.country}`} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />
        <div className="relative mx-auto flex min-h-[28rem] max-w-7xl flex-col justify-end px-4 pb-10 pt-20 text-white sm:px-6 lg:px-8">
          <Link href="/explore-cities" className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm backdrop-blur"><ArrowLeft className="size-4" /> All cities</Link>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-200">{city.country}</p>
          <h1 className="mt-2 font-display text-5xl font-bold sm:text-6xl">{city.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-100">{city.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href={`/create-new-trip?destination=${encodeURIComponent(`${city.name}, ${city.country}`)}&autostart=1`} className="rounded-xl bg-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-teal-400">Plan & save this trip</Link><a href="#places" className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20">View places & costs</a></div>
          <p className="mt-3 text-xs text-slate-200">This starts an itinerary for {city.name}; review it and use Save Trip in the final planner section. ExploreX does not complete reservations.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={<Wallet2 />} label="Daily estimate" value={city.estimatedDailyCost} />
          <Fact icon={<CalendarDays />} label="Ideal stay" value={city.idealDuration} />
          <Fact icon={<Languages />} label="Language" value={city.language} />
          <Fact icon={<Train />} label="Getting around" value={city.localTransit} />
        </div>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.42fr]">
          <div><p className="text-sm font-bold uppercase tracking-wider text-teal-700">Destination overview</p><h2 className="mt-2 font-heading text-3xl font-bold text-slate-900">Plan {city.name} with realistic expectations.</h2><p className="mt-4 text-base leading-8 text-slate-600">{city.summary}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><ShieldCheck className="size-6 text-amber-700" /><h3 className="mt-3 font-heading font-bold text-slate-900">Safety preparation</h3><p className="mt-2 text-sm leading-6 text-slate-600">{city.safetyNote}</p></div>
        </section>

        <section id="places" className="mt-14 scroll-mt-24"><p className="text-sm font-bold uppercase tracking-wider text-teal-700">Places to visit</p><h2 className="mt-2 font-heading text-3xl font-bold text-slate-900">Build your shortlist</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{city.places.map((place) => <article key={place.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{place.category}</p><h3 className="mt-1 font-heading text-xl font-bold text-slate-900">{place.name}</h3></div><MapPin className="size-5 text-teal-600" /></div><p className="mt-3 text-sm leading-6 text-slate-600">{place.description}</p><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><SmallFact label="Estimate" value={place.estimatedCost} /><SmallFact label="Visit" value={place.visitTime} /><SmallFact label="Best time" value={place.bestTime} /></div></article>)}</div></section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2"><InfoList title="Food highlights" items={city.foodHighlights} /><InfoList title="Practical tips" items={[`Best season: ${city.bestSeason}`, `Currency: ${city.currency}`, ...city.travelTips]} /></section>
        <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-500">All costs are indicative planning estimates and may exclude taxes, booking fees, transport, or seasonal pricing. Verify current opening hours, entry requirements, safety advice, weather, and prices with authoritative sources.</p>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3"><span className="text-teal-600 [&>svg]:size-5">{icon}</span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div></div>; }
function SmallFact({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-700">{value}</p></div>; }
function InfoList({ title, items }: { title: string; items: string[] }) { return <div className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-heading text-xl font-bold text-slate-900">{title}</h2><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><Clock3 className="mt-1 size-4 shrink-0 text-teal-600" />{item}</li>)}</ul></div>; }
