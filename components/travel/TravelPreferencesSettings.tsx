"use client";

import { useEffect, useState } from "react";
import {
  TRAVEL_PREFERENCES_KEY,
  travelPreferencesSchema,
  type TravelPreferences,
} from "@/lib/domain/travel-preferences";

const defaults: TravelPreferences = {
  currency: "INR",
  style: "balanced",
  interests: "",
  accommodation: "",
  food: "",
  transport: "",
  walking: "moderate",
};
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

export function TravelPreferencesSettings() {
  const [values, setValues] = useState(defaults);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = localStorage.getItem(TRAVEL_PREFERENCES_KEY);
      if (raw) {
        const parsed = travelPreferencesSchema.safeParse(JSON.parse(raw));
        if (parsed.success) timer = setTimeout(() => setValues(parsed.data), 0);
      }
    } catch {
      timer = setTimeout(
        () =>
          setMessage("Saved preferences could not be read in this browser."),
        0,
      );
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
  const update = <K extends keyof TravelPreferences>(
    key: K,
    value: TravelPreferences[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = travelPreferencesSchema.safeParse(values);
    if (!parsed.success) {
      setMessage("Check your preferences and try again.");
      return;
    }
    try {
      localStorage.setItem(TRAVEL_PREFERENCES_KEY, JSON.stringify(parsed.data));
      setMessage(
        "Preferences saved on this device. They will prefill trip planning on this browser.",
      );
    } catch {
      setMessage("Browser storage is unavailable; preferences were not saved.");
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-white sm:p-7">
      <h2 className="text-xl font-semibold">Travel preferences</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        These preferences are stored in this browser only and are used to
        prefill planning. They are not uploaded to your account.
      </p>
      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Currency{" "}
          <select
            className={inputClass}
            value={values.currency}
            onChange={(event) =>
              update("currency", event.target.value.toUpperCase())
            }
          >
            <option>INR</option>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>AUD</option>
            <option>CAD</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Trip style{" "}
          <select
            className={inputClass}
            value={values.style}
            onChange={(event) =>
              update("style", event.target.value as TravelPreferences["style"])
            }
          >
            <option value="balanced">Balanced</option>
            <option value="budget">Budget</option>
            <option value="slow travel">Slow travel</option>
            <option value="luxury">Comfort focused</option>
            <option value="adventure">Active</option>
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Interests, comma separated
          <input
            className={inputClass}
            maxLength={300}
            value={values.interests}
            onChange={(event) => update("interests", event.target.value)}
            placeholder="Heritage, food, nature"
          />
        </label>
        <label className="text-sm font-medium">
          Accommodation
          <input
            className={inputClass}
            maxLength={180}
            value={values.accommodation}
            onChange={(event) => update("accommodation", event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="text-sm font-medium">
          Food preferences
          <input
            className={inputClass}
            maxLength={180}
            value={values.food}
            onChange={(event) => update("food", event.target.value)}
            placeholder="Optional dietary preferences"
          />
        </label>
        <label className="text-sm font-medium">
          Transport
          <input
            className={inputClass}
            maxLength={180}
            value={values.transport}
            onChange={(event) => update("transport", event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="text-sm font-medium">
          Walking tolerance
          <select
            className={inputClass}
            value={values.walking}
            onChange={(event) =>
              update(
                "walking",
                event.target.value as TravelPreferences["walking"],
              )
            }
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button className="min-h-11 rounded-lg bg-teal-300 px-5 font-semibold text-slate-950 hover:bg-teal-200">
            Save preferences
          </button>
          {message && (
            <p role="status" className="mt-3 text-sm text-slate-300">
              {message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
