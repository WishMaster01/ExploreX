"use client";

import { Heart, Plane, User, Users, UsersRound } from "lucide-react";
import React, { useState } from "react";

export const SelectTravelsList = [
  {
    id: 1,
    title: "Just Me",
    desc: "Solo pace, flexible days, safer evening routes.",
    icon: <Plane className="size-5" />,
    people: "1",
  },
  {
    id: 2,
    title: "Couple",
    desc: "Romantic dining, relaxed timing, scenic stays.",
    icon: <Heart className="size-5" />,
    people: "2",
  },
  {
    id: 3,
    title: "Family",
    desc: "Lower fatigue, kid-friendly stops, easy transport.",
    icon: <Users className="size-5" />,
    people: "3 to 5",
  },
  {
    id: 4,
    title: "Friends",
    desc: "Shared activities, nightlife, flexible budgets.",
    icon: <UsersRound className="size-5" />,
    people: "5 to 10",
  },
  {
    id: 5,
    title: "Group",
    desc: "Larger stays, coordination windows, group logistics.",
    icon: <User className="size-5" />,
    people: "10+",
  },
];

const GroupSizeUI = ({ onSelectOption }: any) => {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (item: any) => {
    setSelected(item.id);
    onSelectOption(`${item.title}: ${item.people}`);
  };

  return (
    <div className="grid gap-2.5">
      {SelectTravelsList.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item)}
          type="button"
          className={`rounded-xl border p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-3.5 ${
            selected === item.id
              ? "border-teal-400 bg-teal-50 text-teal-900 shadow-sm ring-2 ring-teal-500/20"
              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-teal-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600 shadow-sm">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs font-semibold text-teal-600">
                  {item.people} traveler{item.people === "1" ? "" : "s"}
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default GroupSizeUI;
