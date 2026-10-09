"use client";

import { ItineraryEmptyState } from "@/components/travel/ItineraryEmptyState";
import { Button } from "@/components/ui/button";
import { useTripPlan } from "@/context/TripPlanContext";
import type { DisplayTrip, TripInfo } from "@/lib/types/trip";
import { exportTripAsJson } from "@/lib/trip-transform";
import { CheckCircle2, Save } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { ExportPlanDialog } from "./itinerary-export";
import {
  BudgetPanel,
  BookingChecklistPanel,
  DashboardMetrics,
  DestinationIntelPanel,
  HeroPanel,
  InsightsPanel,
  LocalEssentialsPanel,
  PackingPanel,
  RouteOptimizationPanel,
  SharingPanel,
  StayAndFoodPanel,
  TimelinePanel,
  TransportationPanel,
  TravelDocumentsPanel,
  TripComparisonPanel,
} from "./itinerary-panels";

const Itinerary = () => {
  const { displayTrip, tripDetails, tripLoading, registerItineraryRef } =
    useTripPlan();

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
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const openExport = () => setExportOpen(true);
  const saveTrip = async () => {
    if (saveState === "saving" || saveState === "saved") return;
    setSaveState("saving");
    setSaveMessage("");
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: sourceTrip }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.error?.message || "Trip could not be saved.");
      setSaveState("saved");
      setSaveMessage(
        result?.deduplicated
          ? "This trip was already saved."
          : "Trip saved successfully.",
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Trip could not be saved.",
      );
    }
  };

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

        <section className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-sky-50 p-6 text-center shadow-sm sm:flex-row sm:text-left">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
              Final step
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-slate-900">
              Keep this itinerary in Saved Trips.
            </h2>
            <p
              className={`mt-2 text-sm ${saveState === "error" ? "text-rose-600" : "text-slate-600"}`}
            >
              {saveMessage ||
                "Save only when you are happy with the generated plan."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void saveTrip()}
              disabled={saveState === "saving" || saveState === "saved"}
              className="rounded-xl bg-teal-600 px-5 text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {saveState === "saved" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              {saveState === "saving"
                ? "Savingâ€¦"
                : saveState === "saved"
                  ? "Saved"
                  : "Save Trip"}
            </Button>
            {saveState === "saved" && (
              <Link
                href="/saved-trips"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-teal-300 bg-white px-5 text-sm font-bold text-teal-700"
              >
                View Saved Trips
              </Link>
            )}
          </div>
        </section>

        {exportOpen && (
          <ExportPlanDialog
            trip={trip}
            onClose={() => setExportOpen(false)}
            onExportJson={() => exportTripAsJson(sourceTrip)}
          />
        )}

        {loading && (
          <div className="fixed bottom-24 right-6 z-40 rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-medium text-teal-700 shadow-lg">
            Updating itineraryâ€¦
          </div>
        )}
      </div>
    </div>
  );
}

export default Itinerary;
