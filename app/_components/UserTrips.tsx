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
  Heart,
  MapPin,
  Plane,
  Search,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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

const UserTrips = () => {
  const { userDetail } = useUserDetail() || {};
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

  const fetchTrips = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "12", sort });
    if (search.trim()) params.set("search", search.trim());
    if (favoritesOnly) params.set("favorite", "true");
    if (cursor) params.set("cursor", cursor);
    if (cursor) setLoadingMore(true); else setLoading(true);
    try {
      const response = await fetch(`/api/trips?${params}`);
      if (!response.ok) throw new Error("Unable to load trips");
      const data = await response.json();
      const items = Array.isArray(data) ? data : data.items;
      setTrips((current) => cursor ? [...current, ...items] : items);
      setNextCursor(Array.isArray(data) ? null : data.nextCursor);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setNotice("Saved trips could not be loaded.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [favoritesOnly, search, sort]);

  useEffect(() => {
    if (!userDetail?.id) {
      return;
    }

    const timeout = window.setTimeout(() => void fetchTrips(), 300);
    return () => window.clearTimeout(timeout);
  }, [fetchTrips, userDetail?.id]);

  const toggleFavorite = async (trip: SavedTrip) => {
    const isFavorite = !trip.isFavorite;
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, isFavorite } : item));
    const response = await fetch("/api/trips", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: trip.id, isFavorite }),
    });
    if (!response.ok) {
      setTrips((current) => current.map((item) => item.id === trip.id ? trip : item));
      setNotice("Favorite could not be updated.");
    }
  };

  const deleteTrip = async (id: string) => {
    const response = await fetch(`/api/trips?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setTrips((current) => current.filter((trip) => trip.id !== id));
    else setNotice("Trip could not be deleted.");
  };

  const createReminder = async (trip: SavedTrip) => {
    if (!remindAt) return;
    const response = await fetch("/api/reminders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: trip.id, type: "trip", remindAt: new Date(remindAt).toISOString(), message: `Prepare for your ${trip.destination} trip` }),
    });
    if (response.ok) {
      setNotice("Trip reminder scheduled.");
      setReminderTripId(null);
      setRemindAt("");
    } else setNotice("Reminder could not be scheduled.");
  };

  if (!userDetail?.id) return null;

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

  if ((!trips || trips.length === 0) && !search && !favoritesOnly) {
    return (
      <GlassPanel className="mt-8 overflow-hidden p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Archive className="size-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">
              Your saved trips dashboard is ready.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Create a trip to populate favorite trips, recently viewed plans,
              draft itineraries, saved destinations, collaborator-ready cards,
              and travel history.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              "Favorite trips",
              "Draft itineraries",
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
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved destinations" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-400" />
        </label>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort saved trips" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400">
          <option value="recent">Most recent</option>
          <option value="destination">Destination</option>
          <option value="budget">Budget</option>
          <option value="duration">Duration</option>
        </select>
        <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`h-10 rounded-xl border px-3 text-sm font-semibold ${favoritesOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}>
          <Heart className={`mr-2 inline size-4 ${favoritesOnly ? "fill-current" : ""}`} /> Favorites
        </button>
      </div>
      {notice && <p className="mt-3 text-sm font-medium text-teal-700" role="status">{notice}</p>}
      {trips.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">No saved trips match these filters.</div>}
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
                  <button type="button" onClick={() => void toggleFavorite(trip)} aria-label={trip.isFavorite ? "Remove favorite" : "Add favorite"} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Heart className={`size-4 ${trip.isFavorite ? "fill-current" : ""}`} /></button>
                  <button type="button" onClick={() => setReminderTripId((id) => id === trip.id ? null : trip.id)} aria-label="Schedule reminder" className="rounded-lg p-2 text-teal-600 hover:bg-teal-50"><Bell className="size-4" /></button>
                  <button type="button" onClick={() => { if (window.confirm(`Delete the saved trip to ${trip.destination}?`)) void deleteTrip(trip.id); }} aria-label="Delete trip" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="size-4" /></button>
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
                Ready for sharing, comparison, and AI refinement.
              </div>
              {reminderTripId === trip.id && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                  <label className="text-xs font-bold text-slate-700">Remind me at</label>
                  <div className="mt-2 flex gap-2">
                    <input type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" />
                    <button type="button" disabled={!remindAt} onClick={() => void createReminder(trip)} className="rounded-lg bg-teal-600 px-3 text-xs font-bold text-white disabled:opacity-50">Save</button>
                  </div>
                </div>
              )}
            </GlassPanel>
          </motion.div>
        ))}
      </div>
      {nextCursor && <div className="mt-6 text-center"><button type="button" disabled={loadingMore} onClick={() => void fetchTrips(nextCursor)} className="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-sm hover:bg-teal-50 disabled:opacity-50">{loadingMore ? "Loading…" : "Load more trips"}</button></div>}
    </div>
  );
};

const TripMeta = ({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-teal-600">{icon}</span>
    {label}
  </div>
);

export default UserTrips;
