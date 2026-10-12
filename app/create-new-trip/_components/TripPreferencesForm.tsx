"use client";

import { useState, type FormEvent } from "react";
import { tripPreferenceSchema } from "@/lib/domain/schemas";
import { CalendarDays, SlidersHorizontal } from "lucide-react";

type Values = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: string;
  groupType: string;
  budget: string;
  currency: string;
  style: string;
  interests: string;
  accommodation: string;
  food: string;
  transport: string;
  walking: "low" | "moderate" | "high";
};

const initialValues: Values = {
  origin: "",
  destination: "",
  startDate: "",
  endDate: "",
  travelers: "2",
  groupType: "couple",
  budget: "",
  currency: "USD",
  style: "balanced",
  interests: "",
  accommodation: "",
  food: "",
  transport: "",
  walking: "moderate",
};

const fieldClass =
  "mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-600";

export function TripPreferencesForm({
  onSubmit,
}: {
  onSubmit: (message: string) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const update = (field: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const travelerCount = Number(values.travelers);
    const budgetAmount = Number(values.budget.replace(/,/g, "").trim());
    if (
      !Number.isInteger(travelerCount) ||
      travelerCount < 1 ||
      travelerCount > 30
    ) {
      setError("Enter between 1 and 30 travelers.");
      return;
    }
    if (
      !Number.isFinite(budgetAmount) ||
      budgetAmount <= 0 ||
      budgetAmount > 2_000_000_000
    ) {
      setError("Enter a positive budget amount.");
      return;
    }
    const start = values.startDate
      ? new Date(`${values.startDate}T00:00:00Z`)
      : null;
    const end = values.endDate ? new Date(`${values.endDate}T00:00:00Z`) : null;
    const duration =
      start && end
        ? `${Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1} days`
        : "Flexible dates";
    const parsed = tripPreferenceSchema.safeParse({
      origin: values.origin,
      destination: values.destination,
      group_size: `${values.travelers} ${values.groupType}`,
      budget: String(budgetAmount),
      duration,
      interests: values.interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      requirements: [
        values.accommodation && `Accommodation: ${values.accommodation}`,
        values.food && `Food: ${values.food}`,
        values.transport && `Transport: ${values.transport}`,
      ].filter((item): item is string => Boolean(item)),
      currency_code: values.currency,
      travel_style: values.style,
      start_date: values.startDate || undefined,
      end_date: values.endDate || undefined,
      accommodation: values.accommodation || undefined,
      food_preferences: values.food || undefined,
      transport_preferences: values.transport || undefined,
      walking_tolerance: values.walking,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Check the trip details and try again.",
      );
      return;
    }
    setError("");
    const preference = parsed.data;
    const details = [
      `Plan a trip from ${preference.origin} to ${preference.destination}.`,
      `Dates: ${preference.start_date && preference.end_date ? `${preference.start_date} to ${preference.end_date}` : preference.duration}.`,
      `Travelers: ${preference.group_size}. Budget: ${preference.budget} ${preference.currency_code}.`,
      `Travel style: ${preference.travel_style}. Interests: ${preference.interests?.join(", ") || "not specified"}.`,
      `Accommodation: ${preference.accommodation || "no preference"}. Food: ${preference.food_preferences || "no preference"}. Transport: ${preference.transport_preferences || "no preference"}. Walking tolerance: ${preference.walking_tolerance}.`,
    ].join(" ");
    onSubmit(details);
  }

  return (
    <details className="group border-b border-slate-200 bg-slate-50/70" open>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-teal-700" />
          Set your trip preferences
        </span>
        <span className="text-xs font-medium text-slate-500 group-open:hidden">
          Open
        </span>
        <span className="hidden text-xs font-medium text-slate-500 group-open:inline">
          Hide
        </span>
      </summary>
      <form
        onSubmit={handleSubmit}
        className="grid max-h-[44svh] grid-cols-2 gap-3 overflow-y-auto px-4 pb-4"
      >
        <label className="col-span-2 text-xs font-semibold text-slate-700 sm:col-span-1">
          Starting from
          <input
            className={fieldClass}
            value={values.origin}
            onChange={(event) => update("origin", event.target.value)}
            placeholder="City or airport"
            required
          />
        </label>
        <label className="col-span-2 text-xs font-semibold text-slate-700 sm:col-span-1">
          Destination
          <input
            className={fieldClass}
            value={values.destination}
            onChange={(event) => update("destination", event.target.value)}
            placeholder="City or region"
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Start date
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute right-3 top-4 size-4 text-slate-400" />
            <input
              type="date"
              className={fieldClass}
              value={values.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          </span>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          End date
          <input
            type="date"
            className={fieldClass}
            value={values.endDate}
            min={values.startDate || undefined}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Travelers
          <input
            type="number"
            min="1"
            max="30"
            className={fieldClass}
            value={values.travelers}
            onChange={(event) => update("travelers", event.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Group type
          <select
            className={fieldClass}
            value={values.groupType}
            onChange={(event) => update("groupType", event.target.value)}
          >
            <option value="solo">Solo</option>
            <option value="couple">Couple</option>
            <option value="family">Family</option>
            <option value="friends">Friends</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Total budget
          <input
            className={fieldClass}
            value={values.budget}
            onChange={(event) => update("budget", event.target.value)}
            placeholder="e.g. 1800"
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Currency
          <input
            className={fieldClass}
            value={values.currency}
            onChange={(event) =>
              update("currency", event.target.value.toUpperCase())
            }
            maxLength={3}
            placeholder="USD"
            required
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Travel style
          <select
            className={fieldClass}
            value={values.style}
            onChange={(event) => update("style", event.target.value)}
          >
            <option value="balanced">Balanced</option>
            <option value="budget">Budget</option>
            <option value="slow travel">Slow travel</option>
            <option value="luxury">Comfort focused</option>
            <option value="adventure">Active</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Walking
          <select
            className={fieldClass}
            value={values.walking}
            onChange={(event) => update("walking", event.target.value)}
          >
            <option value="low">Keep walking light</option>
            <option value="moderate">Moderate</option>
            <option value="high">Happy to walk</option>
          </select>
        </label>
        <label className="col-span-2 text-xs font-semibold text-slate-700">
          Interests
          <input
            className={fieldClass}
            value={values.interests}
            onChange={(event) => update("interests", event.target.value)}
            placeholder="Museums, food, nature"
          />
        </label>
        <label className="col-span-2 text-xs font-semibold text-slate-700">
          Stay, food, or transport needs
          <input
            className={fieldClass}
            value={values.accommodation}
            onChange={(event) => update("accommodation", event.target.value)}
            placeholder="Accommodation preference (optional)"
          />
          <input
            className={fieldClass}
            value={values.food}
            onChange={(event) => update("food", event.target.value)}
            placeholder="Diet or cuisine needs (optional)"
          />
          <input
            className={fieldClass}
            value={values.transport}
            onChange={(event) => update("transport", event.target.value)}
            placeholder="Transit or mobility preference (optional)"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="col-span-2 text-xs font-medium text-rose-700"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          className="col-span-2 min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Plan with these details
        </button>
      </form>
    </details>
  );
}
