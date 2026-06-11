"use client";

import type { DisplayTrip, TripInfo } from "@/lib/types/trip";
import { transformTripToDisplay } from "@/lib/trip-transform";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type TripPlanContextValue = {
  tripDetails: TripInfo | null;
  displayTrip: DisplayTrip | null;
  tripLoading: boolean;
  tripReady: boolean;
  setTripDetails: (trip: TripInfo | null) => void;
  setTripLoading: (loading: boolean) => void;
  scrollToItinerary: () => void;
  registerItineraryRef: (el: HTMLElement | null) => void;
};

const TripPlanContext = createContext<TripPlanContextValue | null>(null);

export function TripPlanProvider({ children }: { children: React.ReactNode }) {
  const [tripDetails, setTripDetails] = useState<TripInfo | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const itineraryRef = useRef<HTMLElement | null>(null);

  const displayTrip = useMemo(
    () => (tripDetails ? transformTripToDisplay(tripDetails) : null),
    [tripDetails]
  );

  const registerItineraryRef = useCallback((el: HTMLElement | null) => {
    itineraryRef.current = el;
  }, []);

  const scrollToItinerary = useCallback(() => {
    itineraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <TripPlanContext.Provider
      value={{
        tripDetails,
        displayTrip,
        tripLoading,
        tripReady: !!tripDetails,
        setTripDetails,
        setTripLoading,
        scrollToItinerary,
        registerItineraryRef,
      }}
    >
      {children}
    </TripPlanContext.Provider>
  );
}

export function useTripPlan() {
  const ctx = useContext(TripPlanContext);
  if (!ctx) throw new Error("useTripPlan must be used within TripPlanProvider");
  return ctx;
}
