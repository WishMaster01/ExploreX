"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowRight, Bookmark, Compass, MapPin, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { exploreCities, type ExploreCity } from "@/lib/data/cities";

type SavedCity = ExploreCity & { createdAt: string };

export function SavedCities() {
  const { isLoaded, isSignedIn } = useUser();
  const [cities, setCities] = useState<SavedCity[]>([]);
  const [catalog, setCatalog] = useState(exploreCities);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/city-guides")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.cities)) setCatalog(data.cities);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    fetch("/api/saved-cities")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load saved cities");
        return response.json();
      })
      .then((data) => {
        if (active)
          setCities(Array.isArray(data.savedCities) ? data.savedCities : []);
      })
      .catch(() => {
        if (active)
          setNotice("Saved cities could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const remove = async (slug: string) => {
    const response = await fetch(
      `/api/saved-cities?slug=${encodeURIComponent(slug)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setNotice("This city could not be removed. Please try again.");
      return;
    }
    setCities((current) => current.filter((city) => city.slug !== slug));
    setNotice("City removed from your saved list.");
  };

  const recommendations = catalog
    .filter((city) => !cities.some((saved) => saved.slug === city.slug))
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#070b14] px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-200">
            <Bookmark className="size-3.5" /> Your destination collection
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Saved Cities
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            Keep the places you want to explore close at hand, then open a guide
            or start planning a trip.
          </p>
        </div>

        {!isLoaded || (isSignedIn && loading) ? (
          <div
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-label="Loading saved cities"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <>
            {notice && (
              <p
                role="status"
                className="mt-8 text-center text-sm text-teal-200"
              >
                {notice}
              </p>
            )}
            {cities.length > 0 ? (
              <>
                <h2 className="mt-12 text-xl font-semibold">
                  Your saved guides{" "}
                  <span className="text-sm font-normal text-slate-400">
                    ({cities.length})
                  </span>
                </h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {cities.map((city) => (
                    <CityCard
                      key={city.slug}
                      city={city}
                      onRemove={() => void remove(city.slug)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-12 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-400/10 text-teal-200">
                  <Compass className="size-6" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-semibold">
                  Your collection is ready to begin
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  {isSignedIn
                    ? "Save a city from its guide with the heart button. Here are a few guides to get you started."
                    : "Sign in to keep a personal collection. Browse these city guides and save your favorites."}
                </p>
                {!isSignedIn && (
                  <Link
                    href="/sign-in"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-slate-950"
                  >
                    Sign in to save cities <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            )}

            {recommendations.length > 0 && (
              <section className="mt-14">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-300">
                      Explore next
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold">
                      City guide inspiration
                    </h2>
                  </div>
                  <Link
                    href="/explore-cities"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200"
                  >
                    Browse every city <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((city) => (
                    <CityCard key={city.slug} city={city} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function CityCard({
  city,
  onRemove,
}: {
  city: ExploreCity;
  onRemove?: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-lg transition hover:-translate-y-1 hover:border-teal-300/40">
      <Link
        href={`/explore-cities/${city.slug}`}
        className="relative block aspect-[16/10] overflow-hidden"
      >
        <Image
          src={city.image}
          alt={`${city.name}, ${city.country}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">
            {city.flag} {city.country}
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold">
            {city.name}
          </h3>
        </div>
      </Link>
      <div className="p-5">
        <p className="min-h-12 text-sm leading-6 text-slate-300">
          {city.tagline}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-teal-300" />
            {city.idealDuration}
          </span>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-rose-300 hover:bg-rose-400/10"
              aria-label={`Remove ${city.name} from saved cities`}
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          ) : (
            <Link
              href={`/explore-cities/${city.slug}`}
              className="inline-flex items-center gap-1 font-semibold text-teal-300"
            >
              View guide <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
