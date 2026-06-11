"use client";

import { Button } from "@/components/ui/button";
import { CalendarDays, Minus, Plus } from "lucide-react";
import React, { useState } from "react";

const TripDurationUI = ({ onSelectOption }: any) => {
  const [days, setDays] = useState<number>(3);

  const increaseDays = () => setDays((prev) => Math.min(prev + 1, 30));
  const decreaseDays = () => setDays((prev) => (prev > 1 ? prev - 1 : 1));

  const handleConfirm = () => {
    onSelectOption(`Trip Duration: ${days} Days`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
          <CalendarDays className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">How many days?</p>
          <p className="text-xs text-slate-500">This shapes pacing, transit, and rest windows.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button
          onClick={decreaseDays}
          type="button"
          aria-label="Decrease trip duration"
          className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40"
          disabled={days === 1}
        >
          <Minus className="size-4" />
        </button>

        <div className="text-center">
          <span className="block font-heading text-3xl font-bold text-slate-900">{days}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">days</span>
        </div>

        <button
          onClick={increaseDays}
          type="button"
          aria-label="Increase trip duration"
          className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40"
          disabled={days === 30}
        >
          <Plus className="size-4" />
        </button>
      </div>

      <Button
        onClick={handleConfirm}
        className="mt-4 w-full rounded-xl bg-teal-600 text-white hover:bg-teal-700"
      >
        Confirm Duration
      </Button>
    </div>
  );
};

export default TripDurationUI;
