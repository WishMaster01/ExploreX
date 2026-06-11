import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/travel/TravelUI";
import { Compass, Home, Plane } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="travel-page-bg min-h-screen px-4 pt-28 sm:px-6 lg:px-8">
      <GlassPanel className="mx-auto max-w-3xl overflow-hidden p-8 text-center shadow-[var(--shadow-elevated)] sm:p-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25">
          <Compass className="size-9" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-teal-700">
          Route not found
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          This destination is off the map.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          Head back to the travel studio or start a fresh AI itinerary.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md hover:from-teal-700 hover:to-teal-600 sm:w-auto">
              <Home className="size-4" />
              Home
            </Button>
          </Link>
          <Link href="/create-new-trip">
            <Button variant="outline" className="w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto">
              <Plane className="size-4" />
              Create Trip
            </Button>
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
