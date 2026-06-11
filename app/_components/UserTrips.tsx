"use client";

import { useUserDetail } from "@/app/provider";
import {
  GlassPanel,
  SectionHeading,
  SkeletonCard,
} from "@/components/travel/TravelUI";
import {
  Archive,
  CalendarDays,
  Heart,
  MapPin,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const UserTrips = () => {
  const { userDetail } = useUserDetail() || {};
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userDetail?.id) {
      return;
    }

    let isCurrent = true;

    fetch("/api/trips")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (isCurrent) {
          setTrips(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching trips:", error);
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [userDetail?.id]);

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

  if (!trips || trips.length === 0) {
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
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip: any, i: number) => (
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
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                  Saved
                </span>
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
                  label={`Budget: ${trip.budget}`}
                />
                <TripMeta
                  icon={<CalendarDays className="size-4" />}
                  label={`Duration: ${trip.duration}`}
                />
                <TripMeta
                  icon={<Users className="size-4" />}
                  label={`Group: ${trip.groupSize}`}
                />
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600">
                <MapPin className="mr-2 inline size-3.5 text-teal-600" />
                Ready for sharing, comparison, and AI refinement.
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const TripMeta = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-teal-600">{icon}</span>
    {label}
  </div>
);

export default UserTrips;
