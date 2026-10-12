"use client";

import { useUserDetail } from "@/app/provider";
import {
  GlassPanel,
  SectionHeading,
  SkeletonCard,
} from "@/components/travel/TravelUI";
import {
  Archive,
  Bell,
  CalendarDays,
  Copy,
  Download,
  Heart,
  MapPin,
  Plane,
  Search,
  Share2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { logger } from "@/lib/observability/logger";
import { useUser } from "@clerk/nextjs";
import { savedTripSchema } from "@/lib/domain/schemas";
import { exportTripAsJson } from "@/lib/trip-transform";
import { z } from "zod";

type SavedTrip = {
  id: string;
  budget: string | null;
  destination: string;
  duration: string | null;
  groupSize: string | null;
  origin: string | null;
  isFavorite: boolean;
  createdAt: string;
};

const savedTripSummarySchema = z.object({
  id: z.string(),
  budget: z.string().nullable(),
  destination: z.string(),
  duration: z.string().nullable(),
  groupSize: z.string().nullable(),
  origin: z.string().nullable(),
  isFavorite: z.boolean(),
  createdAt: z.string().datetime(),
});

const UserTrips = () => {
  const { userDetail } = useUserDetail() || {};
  const { isLoaded, isSignedIn } = useUser();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [reminderTripId, setReminderTripId] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState("");
  const [notice, setNotice] = useState("");
  const [fetchError, setFetchError] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchTrips = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ limit: "12", sort });
      if (search.trim()) params.set("search", search.trim());
      if (favoritesOnly) params.set("favorite", "true");
      if (cursor) params.set("cursor", cursor);
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/trips?${params}`);
        if (!response.ok) throw new Error("Unable to load trips");
        const data = await response.json();
        setFetchError(false);
        const items = Array.isArray(data) ? data : data.items;
        setTrips((current) => (cursor ? [...current, ...items] : items));
        setNextCursor(Array.isArray(data) ? null : data.nextCursor);
      } catch {
        logger.warn("saved_trips.fetch_failed");
        setFetchError(true);
        setNotice("Saved trips could not be loaded.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [favoritesOnly, search, sort],
  );

  useEffect(() => {
    if (!userDetail?.id) {
      return;
    }

    const timeout = window.setTimeout(() => void fetchTrips(), 300);
    return () => window.clearTimeout(timeout);
  }, [fetchTrips, userDetail?.id]);

  const toggleFavorite = async (trip: SavedTrip) => {
    const isFavorite = !trip.isFavorite;
    setTrips((current) =>
      current.map((item) =>
        item.id === trip.id ? { ...item, isFavorite } : item,
      ),
    );
    try {
      const response = await fetch("/api/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trip.id, isFavorite }),
      });
      if (response.ok) return;
      setTrips((current) =>
        current.map((item) => (item.id === trip.id ? trip : item)),
      );
      setNotice("Favorite could not be updated.");
    } catch {
      setTrips((current) =>
        current.map((item) => (item.id === trip.id ? trip : item)),
      );
      setNotice("Favorite could not be updated.");
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      const response = await fetch(`/api/trips?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTrips((current) => current.filter((trip) => trip.id !== id));
        return;
      }
      setNotice("Trip could not be deleted.");
    } catch {
      setNotice("Trip could not be deleted.");
    }
  };

  const duplicateTrip = async (trip: SavedTrip) => {
    if (duplicatingId) return;
    setDuplicatingId(trip.id);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateId: trip.id }),
      });
      const result: unknown = await response.json();
      const parsed = savedTripSummarySchema.safeParse(result);
      if (!response.ok || !parsed.success) throw new Error("duplicate failed");
      const duplicate = parsed.data;
      setTrips((current) => [duplicate, ...current]);
      setNotice(`Created a copy of the ${trip.destination} trip.`);
    } catch {
      setNotice("Trip could not be duplicated.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const shareTrip = async (trip: SavedTrip) => {
    const summary = `${trip.origin ? `${trip.origin} → ` : ""}${trip.destination} · ${trip.duration || "Flexible dates"} · ${trip.budget || "Budget not set"}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: `ExploreX trip to ${trip.destination}`,
          text: summary,
        });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summary);
        setNotice(
          "Trip summary copied. Saved itineraries remain private to your account.",
        );
      } else setNotice("Sharing is not available in this browser.");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        setNotice("Trip summary could not be shared.");
    }
  };

  const exportTrip = async (trip: SavedTrip) => {
    try {
      const response = await fetch(
        `/api/trips?id=${encodeURIComponent(trip.id)}`,
      );
      if (!response.ok) throw new Error("Trip export failed");
      const payload: unknown = await response.json();
      const plan =
        payload && typeof payload === "object" && "plan" in payload
          ? savedTripSchema.safeParse(payload.plan)
          : null;
      if (!plan || !plan.success) throw new Error("Trip export failed");
      exportTripAsJson(plan.data);
      setNotice(`Exported the ${trip.destination} itinerary.`);
    } catch {
      setNotice("Trip could not be exported.");
    }
  };

  const createReminder = async (trip: SavedTrip) => {
    if (!remindAt) return;
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          type: "trip",
          remindAt: new Date(remindAt).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          message: `Prepare for your ${trip.destination} trip`,
        }),
      });
      if (response.ok) {
        setNotice("Trip reminder scheduled.");
        setReminderTripId(null);
        setRemindAt("");
      } else setNotice("Reminder could not be scheduled.");
    } catch {
      setNotice("Reminder could not be scheduled.");
    }
  };

  if (!isLoaded || (isSignedIn && !userDetail?.id)) {
    return (
      <div
        role="status"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to view saved trips
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your saved itineraries are available in your account.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-5 font-semibold text-white hover:bg-teal-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <SectionHeading
          eyebrow="Saved trips"
          title="Your travel dashboard is loading."
          description="Fetching favorite trips, recent drafts, saved destinations, and travel history."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (fetchError && trips.length === 0) {
    return (
      <div
        className="mt-8 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm"
        role="alert"
      >
        <h2 className="text-xl font-bold text-slate-900">
          Saved trips are unavailable
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We couldn’t load your trips. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void fetchTrips()}
          className="mt-5 min-h-11 rounded-lg bg-teal-700 px-5 font-semibold text-white hover:bg-teal-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if ((!trips || trips.length === 0) && !search && !favoritesOnly) {
    return (
      <GlassPanel className="mt-8 overflow-hidden p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Archive className="size-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">
              No saved trips yet.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Generate an itinerary and select Save Trip in its final section.
              Your saved plans will appear here for searching, sorting,
              favoriting, and reminders.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/create-new-trip"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
              >
                <Plane className="size-4" /> Create a trip
              </Link>
              <Link
                href="/explore-cities"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-300"
              >
                Explore cities
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              "Favorite trips",
              "Recently saved plans",
              "Saved destinations",
              "Travel history",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
              >
                <Heart className="size-4 text-rose-500" />
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="mt-10">
      <SectionHeading
        eyebrow="Saved trips"
        title="Continue planning from your travel dashboard."
        description="Review recently generated itineraries and compare them by budget, duration, group size, and destination."
      />
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved destinations"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-400"
          />
        </label>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort saved trips"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400"
        >
          <option value="recent">Most recent</option>
          <option value="destination">Destination</option>
          <option value="budget">Budget</option>
          <option value="duration">Duration</option>
        </select>
        <button
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          className={`h-10 rounded-xl border px-3 text-sm font-semibold ${favoritesOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}
        >
          <Heart
            className={`mr-2 inline size-4 ${favoritesOnly ? "fill-current" : ""}`}
          />{" "}
          Favorites
        </button>
      </div>
      {notice && (
        <p className="mt-3 text-sm font-medium text-teal-700" role="status">
          {notice}
        </p>
      )}
      {fetchError && (
        <div
          role="alert"
          className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center"
        >
          <span>
            We couldn’t load saved trips. Check your connection and try again.
          </span>
          <button
            type="button"
            onClick={() => void fetchTrips()}
            className="min-h-10 rounded-lg px-3 font-semibold hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}
      {trips.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
          No saved trips match these filters.
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip, i) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassPanel hover className="group h-full overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-md shadow-teal-500/20">
                  <Plane className="size-5" />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(trip)}
                    aria-label={
                      trip.isFavorite ? "Remove favorite" : "Add favorite"
                    }
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                  >
                    <Heart
                      className={`size-4 ${trip.isFavorite ? "fill-current" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReminderTripId((id) =>
                        id === trip.id ? null : trip.id,
                      )
                    }
                    aria-label="Schedule reminder"
                    className="rounded-lg p-2 text-teal-600 hover:bg-teal-50"
                  >
                    <Bell className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete the saved trip to ${trip.destination}?`,
                        )
                      )
                        void deleteTrip(trip.id);
                    }}
                    aria-label="Delete trip"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {trip.origin} → {trip.destination}
              </div>
              <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">
                {trip.destination}
              </h3>
              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <TripMeta
                  icon={<Wallet className="size-4" />}
                  label={`Budget: ${trip.budget || "Not specified"}`}
                />
                <TripMeta
                  icon={<CalendarDays className="size-4" />}
                  label={`Duration: ${trip.duration || "Not specified"}`}
                />
                <TripMeta
                  icon={<Users className="size-4" />}
                  label={`Group: ${trip.groupSize || "Not specified"}`}
                />
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                <MapPin className="mr-2 inline size-3.5 text-teal-600" />
                Saved to your account
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={duplicatingId !== null}
                  onClick={() => void duplicateTrip(trip)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  aria-label={`Duplicate trip to ${trip.destination}`}
                >
                  <Copy className="size-3.5" />
                  {duplicatingId === trip.id ? "Copying…" : "Duplicate"}
                </button>
                <button
                  type="button"
                  onClick={() => void shareTrip(trip)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label={`Share trip summary for ${trip.destination}`}
                >
                  <Share2 className="size-3.5" />
                  Share summary
                </button>
                <button
                  type="button"
                  onClick={() => void exportTrip(trip)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label={`Export trip to ${trip.destination}`}
                >
                  <Download className="size-3.5" />
                  Export
                </button>
              </div>
              {reminderTripId === trip.id && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                  <label className="text-xs font-bold text-slate-700">
                    Remind me at
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="datetime-local"
                      value={remindAt}
                      onChange={(event) => setRemindAt(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!remindAt}
                      onClick={() => void createReminder(trip)}
                      className="rounded-lg bg-teal-600 px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </GlassPanel>
          </motion.div>
        ))}
      </div>
      {nextCursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void fetchTrips(nextCursor)}
            className="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-sm hover:bg-teal-50 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more trips"}
          </button>
        </div>
      )}
    </div>
  );
};

const TripMeta = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-teal-600">{icon}</span>
    {label}
  </div>
);

export default UserTrips;
