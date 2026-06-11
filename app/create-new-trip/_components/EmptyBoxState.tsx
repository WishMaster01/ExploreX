"use client";

import { suggestions } from "@/app/_components/Hero";
import { Bot, Send, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import React from "react";

const EmptyBoxState = ({ onSelectOption }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-full flex-col justify-center rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-sm"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25">
        <Bot className="size-7" />
      </div>
      <h2 className="mt-5 font-heading text-xl font-bold text-slate-900">
        Start with any travel idea.
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        The assistant will collect budget, group size, duration, interests, and route preferences before building the trip.
      </p>

      <div className="mt-6 grid gap-2">
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={suggestion.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onSelectOption(suggestion.title)}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 hover:shadow-sm"
            type="button"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
                {suggestion.icon}
              </span>
              {suggestion.title}
            </span>
            <Send className="size-4 text-slate-400 transition group-hover:text-teal-600" />
          </motion.button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-teal-200/80 bg-teal-50/80 p-3.5 text-left text-xs leading-5 text-teal-800">
        <Sparkles className="mr-2 inline size-3.5" />
        Future-ready for personalization by travel style, adventure level, food preferences, and group needs.
      </div>
    </motion.div>
  );
};

export default EmptyBoxState;
