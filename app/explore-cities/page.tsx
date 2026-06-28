import { SectionHeading } from "@/components/travel/TravelUI";
import { exploreCities } from "@/lib/data/cities";
import { ArrowRight, CalendarDays, MapPin, Wallet2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Explore Cities | ExploreX",
  description: "Browse destination guides with attractions, estimated costs, seasons, transit, and practical travel information.",
};

export default function ExploreCitiesPage() {
  return (
    <div className="min-h-screen px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading align="center" eyebrow="Explore cities" title="Choose a city with enough context to plan well." description="These curated demo guides combine places to visit, indicative daily costs, seasons, transit, food, and practical preparation." />
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-slate-500">Costs are illustrative planning ranges, not live quotes. Verify prices and local conditions before booking.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {exploreCities.map((city) => (
            <Link key={city.slug} href={`/explore-cities/${city.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={city.image} alt={`${city.name}, ${city.country}`} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 text-white"><p className="text-xs font-bold uppercase tracking-wider text-teal-200">{city.country}</p><h2 className="font-heading text-2xl font-bold">{city.name}</h2></div>
              </div>
              <div className="p-5">
                <p className="min-h-12 text-sm leading-6 text-slate-600">{city.tagline}</p>
                <div className="mt-4 grid gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-2"><Wallet2 className="size-4 text-teal-600" />{city.estimatedDailyCost}</span>
                  <span className="flex items-center gap-2"><CalendarDays className="size-4 text-teal-600" />{city.idealDuration}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-4 text-teal-600" />{city.places.length} highlighted places</span>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700">View city guide <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

