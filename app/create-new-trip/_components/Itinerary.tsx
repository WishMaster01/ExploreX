"use client";

import { ItineraryEmptyState } from "@/components/travel/ItineraryEmptyState";
import { GlassPanel, MetricCard, SectionHeading } from "@/components/travel/TravelUI";
import { Button } from "@/components/ui/button";
import { useTripPlan } from "@/context/TripPlanContext";
import type { DisplayTrip, TripInfo } from "@/lib/types/trip";
import { exportTripAsJson } from "@/lib/trip-transform";
import { fuzzySearch } from "@/lib/algorithms/search/fuzzy-search";
import {
  BadgeCheck,
  BookOpen,
  Bus,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  Coffee,
  Compass,
  DollarSign,
  Download,
  FileText,
  Gem,
  Globe2,
  HeartHandshake,
  Hotel,
  Languages,
  Luggage,
  Map,
  MapPin,
  MessageSquareShare,
  Phone,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Timer,
  Train,
  Utensils,
  Users,
  Wallet2,
  X,
} from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";
import React, { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45 },
  }),
};

const Itinerary = () => {
  const { displayTrip, tripDetails, tripLoading, registerItineraryRef } = useTripPlan();

  if (!displayTrip || !tripDetails) {
    return <ItineraryEmptyState />;
  }

  return (
    <ItineraryDashboard
      trip={displayTrip}
      sourceTrip={tripDetails}
      registerRef={registerItineraryRef}
      loading={tripLoading}
    />
  );
};

function ItineraryDashboard({
  trip,
  sourceTrip,
  registerRef,
  loading,
}: {
  trip: DisplayTrip;
  sourceTrip: TripInfo;
  registerRef: (el: HTMLElement | null) => void;
  loading: boolean;
}) {
  const destCity = trip.destination.split(",")[0];
  const [exportOpen, setExportOpen] = useState(false);
  const openExport = () => setExportOpen(true);

  return (
    <div
      ref={registerRef}
      id="itinerary-dashboard"
      className="travel-page-bg p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <HeroPanel trip={trip} onExport={openExport} destCity={destCity} />
        <DashboardMetrics trip={trip} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-6">
            <TimelinePanel trip={trip} />
            <StayAndFoodPanel trip={trip} />
            <DestinationIntelPanel trip={trip} destCity={destCity} />
            <TripComparisonPanel trip={trip} />
            <TravelDocumentsPanel trip={trip} />
            <BookingChecklistPanel trip={trip} />
          </div>
          <div className="space-y-6">
            <RouteOptimizationPanel trip={trip} />
            <BudgetPanel trip={trip} />
            <TransportationPanel trip={trip} />
            <InsightsPanel trip={trip} />
            <LocalEssentialsPanel trip={trip} />
            <PackingPanel trip={trip} />
            <SharingPanel onExport={openExport} />
          </div>
        </div>

        {exportOpen && (
          <ExportPlanDialog
            trip={trip}
            onClose={() => setExportOpen(false)}
            onExportJson={() => exportTripAsJson(sourceTrip)}
          />
        )}

        {loading && (
          <div className="fixed bottom-24 right-6 z-40 rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-medium text-teal-700 shadow-lg">
            Updating itinerary…
          </div>
        )}
      </div>
    </div>
  );
}

function HeroPanel({
  trip,
  onExport,
  destCity,
}: {
  trip: DisplayTrip;
  onExport: () => void;
  destCity: string;
}) {
  const handleShare = async () => {
    const text = `${trip.origin} → ${trip.destination} · ${trip.duration} · ${trip.budget}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Trip to ${destCity}`, text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <GlassPanel className="overflow-hidden shadow-[var(--shadow-elevated)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Sparkles className="size-3.5" />
              AI itinerary dashboard
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Your {destCity} adventure — optimized for time, budget, and local context.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {trip.origin} → {trip.destination} · {trip.group_size} · {trip.totalActivities} planned stops
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={handleShare}
                className="btn-shine rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md hover:from-teal-700 hover:to-teal-600"
              >
                <MessageSquareShare className="size-4" />
                Share Trip
              </Button>
              <Button
                variant="outline"
                onClick={onExport}
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Download className="size-4" />
                Export Plan
              </Button>
            </div>
          </div>
          <div className="relative min-h-[260px] overflow-hidden lg:min-h-full">
            <Image
              src={trip.heroImage}
              alt={trip.destination}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-2 gap-3 text-white">
              <MiniStat label="Stops" value={String(trip.totalActivities)} />
              <MiniStat label="Days" value={trip.duration.replace(/[^0-9]/g, "") || "—"} />
            </div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function DashboardMetrics({ trip }: { trip: DisplayTrip }) {
  const cards = [
    { icon: <Plane className="size-5" />, label: "Route", value: `${trip.origin} → ${trip.destination.split(",")[0]}`, detail: "AI-optimized route" },
    { icon: <CalendarDays className="size-5" />, label: "Duration", value: trip.duration, detail: trip.group_size },
    { icon: <Wallet2 className="size-5" />, label: "Budget", value: trip.budget, detail: "Estimated total" },
    { icon: <Route className="size-5" />, label: "Transit", value: trip.transitMinutes, detail: trip.walkDistance + " walking" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <MetricCard {...card} />
        </motion.div>
      ))}
    </div>
  );
}

function TimelinePanel({ trip }: { trip: DisplayTrip }) {
  if (trip.days.length === 0) return null;

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={0}>
      <GlassPanel className="p-5 sm:p-6">
        <SectionHeading
          eyebrow="AI travel timeline"
          title="Day-wise schedule with morning, afternoon, and evening pacing."
          description="Activities grouped by optimal visit windows from your AI-generated plan."
        />
        <div className="mt-6 space-y-6">
          {trip.days.map((day, dayIdx) => (
            <motion.div
              key={day.day}
              custom={dayIdx}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-600">Day {day.day}</p>
                  <h3 className="mt-1 font-heading text-xl font-bold text-slate-900">{day.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700">{day.best}</span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">{day.route}</span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {day.segments.map((segment) => (
                  <div
                    key={`${day.day}-${segment.title}`}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={segment.image}
                        alt={segment.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 1024px) 100vw, 28vw"
                        unoptimized
                      />
                      <div className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {segment.period}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-heading font-bold text-slate-900">{segment.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3">{segment.detail}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="size-3" />
                        <span className="truncate">{segment.address}</span>
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5"><Timer className="size-3.5 text-teal-600" />{segment.duration}</span>
                        <span className="flex items-center gap-1.5"><DollarSign className="size-3.5 text-teal-600" />{segment.cost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function StayAndFoodPanel({ trip }: { trip: DisplayTrip }) {
  const [hotelQuery, setHotelQuery] = useState("");
  const matchingHotels = hotelQuery.trim()
    ? fuzzySearch(hotelQuery, trip.hotels.map((hotel) => ({ ...hotel, label: hotel.name, aliases: [hotel.address] })), 10)
    : trip.hotels;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
        <GlassPanel className="h-full p-5 sm:p-6">
          <PanelTitle icon={<Hotel className="size-5" />} title="Hotel Recommendations" />
          <div className="mt-5 space-y-4">
            {trip.hotels.length > 0 && (
              <label className="relative mb-3 block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input value={hotelQuery} onChange={(event) => setHotelQuery(event.target.value)} placeholder="Search hotels or locations" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-400" />
              </label>
            )}
            {matchingHotels.length === 0 ? (
              <p className="text-sm text-slate-500">No hotels in this plan yet.</p>
            ) : (
              matchingHotels.map((hotel) => (
                <div key={hotel.name} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image src={hotel.image} alt={hotel.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="40vw" unoptimized />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading font-bold text-slate-900">{hotel.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{hotel.address}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <Star className="size-3.5 fill-current" /> {hotel.rating}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{hotel.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-teal-700">{hotel.price}/night</p>
                      {hotel.recommendationScore !== undefined && <span className="text-[11px] font-bold text-slate-500">Match {Math.round(hotel.recommendationScore * 100)}%</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
        <GlassPanel className="h-full p-5 sm:p-6">
          <PanelTitle icon={<Utensils className="size-5" />} title="Dining & Food Spots" />
          <div className="mt-5 space-y-3">
            {trip.restaurants.map((r) => (
              <div key={r.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-slate-900">{r.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{r.type}</p>
                  </div>
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{r.price}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{r.note}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

function RouteOptimizationPanel({ trip }: { trip: DisplayTrip }) {
  const iconFor = (type: string) => {
    if (type === "hotel") return <Hotel className="size-4" />;
    if (type === "food") return <Coffee className="size-4" />;
    return <Gem className="size-4" />;
  };

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<Map className="size-5" />} title="Interactive Map" />
        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50 via-sky-50 to-white">
          {trip.mapMarkers.length > 1 && (
            <div className="absolute left-[20%] top-[30%] h-0.5 w-[50%] rotate-[15deg] bg-teal-500/50" />
          )}
          {trip.mapMarkers.map((marker) => (
            <div key={marker.label} className="absolute" style={{ left: marker.left, top: marker.top }}>
              <div className="flex size-10 animate-pulse-route items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg">
                {iconFor(marker.type)}
              </div>
              <p className="mt-1 max-w-[72px] truncate rounded-full border border-white bg-white/90 px-2 py-0.5 text-center text-[10px] font-bold text-slate-700 shadow-sm">
                {marker.label}
              </p>
            </div>
          ))}
          <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs leading-5 text-slate-600 shadow-md backdrop-blur">
            {trip.mapTip}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MapMetric icon={<Train className="size-4" />} label="Transit" value={trip.transitMinutes} />
          <MapMetric icon={<Car className="size-4" />} label="Route" value={trip.routeDistance} />
          <MapMetric icon={<Route className="size-4" />} label="Walk" value={trip.walkDistance} />
          <MapMetric icon={<Sparkles className="size-4" />} label="Distance saved" value={trip.distanceSaved} />
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function BudgetPanel({ trip }: { trip: DisplayTrip }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<Wallet2 className="size-5" />} title="Smart Budget Planner" />
        <div className="mt-5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
          <p className="text-sm text-slate-300">Estimated total</p>
          <p className="mt-1 font-heading text-3xl font-bold">{trip.budget}</p>
          {trip.budgetActivityNames.length > 0 && (
            <p className="mt-2 text-xs text-slate-300">Knapsack selection: {trip.budgetActivityNames.length} activities{trip.budgetActivityCost > 0 ? ` · estimated ${trip.budgetActivityCost.toLocaleString()}` : ""}</p>
          )}
          <div className="mt-4 space-y-3">
            {trip.budgetBreakdown.map(({ label, percent }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500" style={{ width: `${percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {trip.budgetTiers.map((tier) => (
            <div
              key={tier.label}
              className={`rounded-xl border p-3.5 shadow-sm transition hover:shadow-md ${
                tier.recommended ? "border-teal-300 bg-teal-50/50 ring-2 ring-teal-500/20" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-slate-900">{tier.label}</p>
                <p className="font-bold text-teal-600">{tier.value}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{tier.detail}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function InsightsPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Sun, Users, ShieldCheck, HeartHandshake, CloudSun, Globe2];
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<CloudSun className="size-5" />} title="AI Travel Insights" />
        <div className="mt-5 grid gap-3">
          {trip.insights.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                  <p className="text-sm font-medium text-slate-800">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function DestinationIntelPanel({ trip, destCity }: { trip: DisplayTrip; destCity: string }) {
  const groups = [
    { icon: <BadgeCheck className="size-5" />, title: "Top attractions", items: trip.topAttractions },
    { icon: <Gem className="size-5" />, title: "From your plan", items: trip.days.flatMap((d) => d.segments.map((s) => s.title)).slice(3, 6) },
    { icon: <Camera className="size-5" />, title: "Photo spots", items: trip.days.flatMap((d) => d.segments.filter((s) => s.period === "Morning").map((s) => s.title)).slice(0, 3) },
    { icon: <Utensils className="size-5" />, title: "Food & dining", items: trip.restaurants.map((r) => r.name) },
    { icon: <Users className="size-5" />, title: "Group fit", items: [`Optimized for ${trip.group_size}`, `${trip.duration} pacing`, `${trip.totalActivities} activities`] },
    { icon: <Compass className="size-5" />, title: `${destCity} highlights`, items: trip.days.map((d) => d.title).slice(0, 3) },
  ];

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <GlassPanel className="p-5 sm:p-6">
        <SectionHeading
          eyebrow="Destination intelligence"
          title="Attractions, dining, and experience lanes from your AI plan."
          description={`Personalized for ${trip.group_size} traveling to ${trip.destination}.`}
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
                  {group.icon}
                </div>
                <h3 className="font-heading font-bold text-slate-900">{group.title}</h3>
              </div>
              <div className="space-y-2">
                {group.items.filter(Boolean).map((item) => (
                  <p key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="size-3.5 shrink-0 text-teal-500" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function PackingPanel({ trip }: { trip: DisplayTrip }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const done = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((done / trip.packingItems.length) * 100) || 0;

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<Luggage className="size-5" />} title="Smart Packing" />
        <div className="mt-5 space-y-2.5">
          {trip.packingItems.map((item, index) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30"
            >
              <input
                type="checkbox"
                checked={!!checked[index]}
                onChange={() => toggle(index)}
                className="size-4 rounded border-slate-300 accent-teal-600"
              />
              {item}
            </label>
          ))}
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{progress}% packed for {trip.destination.split(",")[0]}.</p>
      </GlassPanel>
    </motion.div>
  );
}

function TravelDocumentsPanel({ trip }: { trip: DisplayTrip }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <GlassPanel className="p-5 sm:p-6">
        <PanelTitle icon={<FileText className="size-5" />} title="Travel Documents" />
        <p className="mt-2 text-xs text-slate-500">Essential paperwork for {trip.destination}</p>
        <div className="mt-4 space-y-2.5">
          {trip.travelDocuments.map((doc) => (
            <div key={doc.item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <BookOpen className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{doc.item}</p>
                <p className="mt-0.5 text-xs text-slate-500">{doc.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function BookingChecklistPanel({ trip }: { trip: DisplayTrip }) {
  const [booked, setBooked] = useState<Record<number, boolean>>({});

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
      <GlassPanel className="p-5 sm:p-6">
        <PanelTitle icon={<ClipboardList className="size-5" />} title="Booking Checklist" />
        <p className="mt-2 text-xs text-slate-500">Track reservations before you depart</p>
        <div className="mt-4 space-y-2">
          {trip.bookingChecklist.map((item, i) => (
            <label
              key={item.item}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-teal-200"
            >
              <span className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={booked[i] ?? item.booked}
                  onChange={() => setBooked((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className="size-4 accent-teal-600"
                />
                {item.item}
              </span>
              {(booked[i] ?? item.booked) && (
                <span className="text-xs font-semibold text-teal-600">Done</span>
              )}
            </label>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function TransportationPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Plane, Bus, Route, Car];
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<Bus className="size-5" />} title="Transportation" />
        <div className="mt-4 space-y-2.5">
          {trip.transportation.map((t, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={t.mode} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{t.mode}</p>
                    <p className="text-sm font-bold text-teal-600">{t.value}</p>
                  </div>
                  <p className="text-xs text-slate-500">{t.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function LocalEssentialsPanel({ trip }: { trip: DisplayTrip }) {
  const icons = [Phone, DollarSign, Languages, HeartHandshake, Globe2];
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<Globe2 className="size-5" />} title="Local Essentials" />
        <div className="mt-4 space-y-2.5">
          {trip.localEssentials.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                  <p className="text-sm font-medium text-slate-800">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function TripComparisonPanel({ trip }: { trip: DisplayTrip }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
      <GlassPanel className="p-5 sm:p-6">
        <PanelTitle icon={<Compass className="size-5" />} title="Trip Style Comparison" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {trip.tripComparison.map((plan) => (
            <div
              key={plan.label}
              className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                plan.recommended ? "border-teal-300 bg-teal-50/50 ring-2 ring-teal-500/20" : "border-slate-200 bg-white"
              }`}
            >
              <h3 className="font-heading font-bold text-slate-900">{plan.label}</h3>
              {plan.recommended && (
                <span className="mt-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Your plan
                </span>
              )}
              <p className="mt-3 text-lg font-bold text-teal-600">{plan.value}</p>
              <p className="mt-1 text-sm text-slate-600">{plan.detail}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function SharingPanel({ onExport }: { onExport: () => void }) {
  const [toggles, setToggles] = useState([true, true, false, false]);

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}>
      <GlassPanel className="p-5">
        <PanelTitle icon={<MessageSquareShare className="size-5" />} title="Trip Sharing" />
        <div className="mt-5 space-y-2.5">
          {["Private trip", "Invite collaborators", "Public showcase card", "Export plan"].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-700 shadow-sm">
              <span>{item}</span>
              <button
                type="button"
                aria-label={`Toggle ${item}`}
                onClick={() => {
                  if (index === 3) onExport();
                  else setToggles((prev) => prev.map((v, i) => (i === index ? !v : v)));
                }}
                className={`relative h-6 w-11 rounded-full transition ${toggles[index] ? "bg-teal-500" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 block size-5 rounded-full bg-white shadow-sm transition ${toggles[index] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function tripFileName(trip: DisplayTrip, extension: string) {
  const slug = trip.destination
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `trip-${slug || "plan"}.${extension}`;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function estimateImageHeight(trip: DisplayTrip) {
  const dayLines = trip.days.reduce(
    (sum, day) => sum + 96 + day.segments.length * 42,
    0
  );
  const hotelLines = Math.min(trip.hotels.length, 5) * 42;

  return Math.max(1100, 540 + dayLines + hotelLines);
}

function downloadTripAsImage(trip: DisplayTrip) {
  const width = 1400;
  const height = estimateImageHeight(trip);
  const scale = 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 340);
  gradient.addColorStop(0, "#0f766e");
  gradient.addColorStop(0.58, "#14b8a6");
  gradient.addColorStop(1, "#0284c7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, 340);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 58px Arial";
  let y = drawWrappedText(ctx, `Trip to ${trip.destination}`, 72, 112, 980, 68);

  ctx.font = "500 28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  y = drawWrappedText(
    ctx,
    `${trip.origin} to ${trip.destination} | ${trip.duration} | ${trip.group_size} | ${trip.budget}`,
    72,
    y + 18,
    1100,
    38
  );

  const stats = [
    ["Stops", String(trip.totalActivities)],
    ["Transit", trip.transitMinutes],
    ["Walking", trip.walkDistance],
  ];

  stats.forEach(([label, value], index) => {
    const x = 72 + index * 238;
    drawRoundedRect(ctx, x, 238, 204, 74, 18);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "600 18px Arial";
    ctx.fillText(label, x + 20, 266);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 25px Arial";
    ctx.fillText(value, x + 20, 298);
  });

  y = 420;
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial";
  ctx.fillText("Day-wise itinerary", 72, y);
  y += 44;

  for (const day of trip.days) {
    drawRoundedRect(ctx, 72, y, 1256, 58 + day.segments.length * 42, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0f766e";
    ctx.font = "700 22px Arial";
    ctx.fillText(`Day ${day.day}`, 104, y + 38);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 25px Arial";
    ctx.fillText(day.title, 218, y + 38);

    let itemY = y + 82;
    ctx.font = "500 22px Arial";
    ctx.fillStyle = "#334155";
    for (const segment of day.segments) {
      ctx.fillText(`${segment.period}: ${segment.title}`, 104, itemY);
      ctx.fillStyle = "#64748b";
      ctx.font = "400 18px Arial";
      ctx.fillText(`${segment.duration} | ${segment.cost}`, 920, itemY);
      ctx.fillStyle = "#334155";
      ctx.font = "500 22px Arial";
      itemY += 42;
    }

    y += 84 + day.segments.length * 42;
  }

  if (trip.hotels.length > 0) {
    y += 20;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 34px Arial";
    ctx.fillText("Hotel options", 72, y);
    y += 46;

    ctx.font = "500 22px Arial";
    for (const hotel of trip.hotels.slice(0, 5)) {
      ctx.fillStyle = "#334155";
      ctx.fillText(`${hotel.name} | ${hotel.price}/night | Rating ${hotel.rating}`, 96, y);
      y += 42;
    }
  }

  y += 20;
  ctx.fillStyle = "#64748b";
  ctx.font = "500 20px Arial";
  drawWrappedText(ctx, `Top attractions: ${trip.topAttractions.join(", ")}`, 72, y, 1220, 30);

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = tripFileName(trip, "png");
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printableTripHtml(trip: DisplayTrip) {
  const days = trip.days
    .map(
      (day) => `
        <section>
          <h2>Day ${day.day}: ${escapeHtml(day.title)}</h2>
          <p class="muted">${escapeHtml(day.best)} | ${escapeHtml(day.route)}</p>
          ${day.segments
            .map(
              (segment) => `
                <div class="item">
                  <strong>${escapeHtml(segment.period)}: ${escapeHtml(segment.title)}</strong>
                  <p>${escapeHtml(segment.detail)}</p>
                  <p class="muted">${escapeHtml(segment.address)} | ${escapeHtml(segment.duration)} | ${escapeHtml(segment.cost)}</p>
                </div>
              `
            )
            .join("")}
        </section>
      `
    )
    .join("");

  const hotels = trip.hotels
    .slice(0, 6)
    .map(
      (hotel) => `
        <div class="item">
          <strong>${escapeHtml(hotel.name)}</strong>
          <p>${escapeHtml(hotel.description)}</p>
          <p class="muted">${escapeHtml(hotel.address)} | ${escapeHtml(hotel.price)}/night | Rating ${hotel.rating}</p>
        </div>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(trip.destination)} trip plan</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
          main { max-width: 900px; margin: 0 auto; padding: 36px; }
          header { border-radius: 24px; background: linear-gradient(135deg, #0f766e, #14b8a6, #0284c7); color: white; padding: 36px; }
          h1 { margin: 0; font-size: 38px; line-height: 1.1; }
          h2 { margin: 0 0 8px; font-size: 22px; }
          p { line-height: 1.55; }
          section { margin-top: 22px; border: 1px solid #e2e8f0; border-radius: 18px; background: white; padding: 22px; break-inside: avoid; }
          .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; }
          .meta div { border: 1px solid rgba(255,255,255,0.28); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.14); }
          .label { display: block; color: rgba(255,255,255,0.72); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
          .value { display: block; margin-top: 4px; font-weight: 700; }
          .item { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
          .item:first-of-type { border-top: 0; padding-top: 0; }
          .muted { color: #64748b; }
          .actions { position: sticky; top: 0; z-index: 2; padding: 14px 0; text-align: right; }
          button { border: 0; border-radius: 12px; background: #0f766e; color: white; cursor: pointer; font-weight: 700; padding: 11px 16px; }
          @media print {
            body { background: white; }
            main { max-width: none; padding: 0; }
            .actions { display: none; }
            section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <main>
          <div class="actions"><button onclick="window.print()">Save as PDF</button></div>
          <header>
            <h1>Trip to ${escapeHtml(trip.destination)}</h1>
            <p>${escapeHtml(trip.origin)} to ${escapeHtml(trip.destination)}</p>
            <div class="meta">
              <div><span class="label">Duration</span><span class="value">${escapeHtml(trip.duration)}</span></div>
              <div><span class="label">Budget</span><span class="value">${escapeHtml(trip.budget)}</span></div>
              <div><span class="label">Group</span><span class="value">${escapeHtml(trip.group_size)}</span></div>
              <div><span class="label">Stops</span><span class="value">${trip.totalActivities}</span></div>
            </div>
          </header>
          ${days}
          <section>
            <h2>Hotel options</h2>
            ${hotels || "<p>No hotel recommendations in this plan.</p>"}
          </section>
          <section>
            <h2>Top attractions</h2>
            <p>${escapeHtml(trip.topAttractions.join(", "))}</p>
          </section>
        </main>
        <script>setTimeout(() => window.print(), 500);</script>
      </body>
    </html>
  `;
}

function openTripPdfWindow(trip: DisplayTrip) {
  const printWindow = window.open("", "_blank", "width=980,height=1100");

  if (!printWindow) {
    window.alert("Allow popups to open the PDF export window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(printableTripHtml(trip));
  printWindow.document.close();
}

function ExportPlanDialog({
  trip,
  onClose,
  onExportJson,
}: {
  trip: DisplayTrip;
  onClose: () => void;
  onExportJson: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
              Export plan
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-slate-900">
              Download your itinerary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a shareable image or a printable PDF format.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close export dialog"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5">
          <Button
            type="button"
            onClick={() => downloadTripAsImage(trip)}
            className="h-auto justify-start rounded-xl bg-teal-600 p-4 text-left text-white hover:bg-teal-700"
          >
            <Camera className="size-5" />
            <span>
              <span className="block font-bold">Download image</span>
              <span className="block text-xs font-medium text-teal-50">
                Saves a PNG summary card of the itinerary.
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => openTripPdfWindow(trip)}
            className="h-auto justify-start rounded-xl p-4 text-left"
          >
            <FileText className="size-5 text-teal-600" />
            <span>
              <span className="block font-bold text-slate-900">Open PDF window</span>
              <span className="block text-xs font-medium text-slate-500">
                Opens a print-ready plan. Use Save as PDF in the print dialog.
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onExportJson}
            className="justify-start rounded-xl text-slate-600"
          >
            <Download className="size-4" />
            Download JSON data
          </Button>
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
        {icon}
      </div>
      <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-xl">
      <p className="text-xs text-white/80">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold">{value}</p>
    </div>
  );
}

function MapMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-teal-600">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default Itinerary;
