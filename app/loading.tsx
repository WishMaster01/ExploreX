import { SkeletonCard, travelGradient } from "@/components/travel/TravelUI";
import { Bot, Plane } from "lucide-react";

export default function Loading() {
  return (
    <div className={`min-h-screen px-4 pt-28 sm:px-6 lg:px-8 ${travelGradient}`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-4">
          <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25 animate-ai-pulse">
            <Bot className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700">
              AI is preparing your journey
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">
              Loading travel intelligence
            </h1>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-6 glass-card rounded-2xl p-5">
          <Plane className="size-6 text-teal-600" />
          <div className="mt-4 h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
