import { BadgeDollarSign, Crown, Wallet } from "lucide-react";
import React, { useState } from "react";

export const SelectBudgetOptions = [
  {
    id: 1,
    title: "Budget",
    desc: "Keep costs lean with hostels, transit, free attractions, and local food.",
    icon: <Wallet className="size-5" />,
    range: "$0 - $500",
  },
  {
    id: 2,
    title: "Standard",
    desc: "Comfortable hotels, a few paid experiences, and efficient transport.",
    icon: <BadgeDollarSign className="size-5" />,
    range: "$500 - $1500",
  },
  {
    id: 3,
    title: "Luxury",
    desc: "Premium stays, curated dining, private transfers, and signature experiences.",
    icon: <Crown className="size-5" />,
    range: "$1500+",
  },
];

const BudgetUI = ({ onSelectOption }: any) => {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (item: any) => {
    setSelected(item.id);
    onSelectOption(`${item.title}: ${item.desc}`);
  };

  return (
    <div className="grid gap-2.5">
      {SelectBudgetOptions.map((item) => (
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
                <p className="text-xs font-semibold text-teal-600">{item.range}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default BudgetUI;
