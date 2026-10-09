"use client";

import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import { Wallet2 } from "lucide-react";
import { fadeUp, PanelTitle } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function BudgetPanel({ trip }: { trip: DisplayTrip }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={1}
    >
      <GlassPanel className="p-5">
        <PanelTitle
          icon={<Wallet2 className="size-5" />}
          title="Smart Budget Planner"
        />

        <div className="mt-5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
          <p className="text-sm text-slate-300">Estimated total</p>

          <p className="mt-1 font-heading text-3xl font-bold">{trip.budget}</p>

          {trip.budgetActivityNames.length > 0 && (
            <p className="mt-2 text-xs text-slate-300">
              Knapsack selection: {trip.budgetActivityNames.length} activities
              {trip.budgetActivityCost > 0
                ? ` · estimated ${trip.budgetActivityCost.toLocaleString()}`
                : ""}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {trip.budgetBreakdown.map(({ label, percent }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span>{percent}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                    style={{ width: `${percent}%` }}
                  />
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
                tier.recommended
                  ? "border-teal-300 bg-teal-50/50 ring-2 ring-teal-500/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-slate-900">
                  {tier.label}
                </p>

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
