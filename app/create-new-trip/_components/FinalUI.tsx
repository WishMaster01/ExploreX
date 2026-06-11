"use client";

import { AIThinking } from "@/components/travel/TravelUI";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Globe2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import React from "react";

const FinalUI = ({
  viewTrip,
  disable,
  loading = false,
}: {
  viewTrip: () => void;
  disable: boolean;
  loading?: boolean;
}) => {
  const steps = [
    "Optimizing attractions by distance and crowd timing",
    "Estimating accommodation, food, transport, and activity costs",
    "Preparing map, packing, documents, and booking checklist",
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <AIThinking message={loading ? "Generating your personalized itinerary..." : "Trip plan ready!"} />
      <div className="mt-4 grid gap-2 text-xs">
        {steps.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600"
          >
            <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
            {item}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-teal-200/80 bg-teal-50/80 p-3 text-xs leading-5 text-teal-800">
        <Globe2 className="mt-0.5 size-4 shrink-0" />
        <span>
          {loading
            ? "Your trip will appear in the dashboard panel automatically when ready."
            : "Your trip is saved and displayed in the itinerary dashboard."}
        </span>
      </div>
      <Button
        disabled={disable || loading}
        onClick={viewTrip}
        className="mt-4 w-full rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Sparkles className="size-4" />
        View Trip Dashboard
      </Button>
    </div>
  );
};

export default FinalUI;
