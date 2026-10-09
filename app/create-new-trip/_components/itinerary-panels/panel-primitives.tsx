"use client";

import React from "react";

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
    },
  }),
};

export function PanelTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
        {icon}
      </div>

      <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-xl">
      <p className="text-xs text-white/80">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold">{value}</p>
    </div>
  );
}

export function MapMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-teal-600">{icon}</div>

      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
