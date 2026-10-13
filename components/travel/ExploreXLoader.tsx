import { ExploreXBrand } from "@/components/travel/ExploreXBrand";
import { Compass, MapPin, Plane } from "lucide-react";

export function ExploreXLoader() {
  return (
    <main
      className="explorex-loader relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#060a12] px-5 text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading ExploreX travel intelligence"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="explorex-loader-glow absolute left-1/2 top-[38%] size-[min(78vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.14)_0.7px,transparent_0.7px)] bg-[size:28px_28px] opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <div className="explorex-loader-brand rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <ExploreXBrand size="large" />
          </div>
        </div>

        <div
          className="explorex-loader-stage relative mx-auto mt-12 flex size-56 items-center justify-center sm:size-64"
          aria-hidden="true"
        >
          <div className="absolute inset-5 rounded-full border border-white/[0.08]" />
          <div className="absolute inset-10 rounded-full border border-dashed border-teal-300/20" />
          <div className="explorex-loader-orbit absolute inset-0 rounded-full border border-teal-300/20">
            <span className="absolute left-1/2 top-0 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-teal-200/30 bg-[#0a1720] text-teal-200 shadow-[0_0_30px_rgba(45,212,191,0.22)]">
              <Plane className="size-4 -rotate-12" />
            </span>
          </div>
          <div className="explorex-loader-orbit-reverse absolute inset-7 rounded-full border border-sky-300/15">
            <span className="absolute bottom-5 right-4 size-2 rounded-full bg-sky-200 shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
          </div>
          <div className="relative flex size-24 items-center justify-center rounded-[2rem] border border-teal-200/20 bg-gradient-to-br from-teal-300/15 via-slate-900 to-sky-400/10 shadow-[0_0_70px_rgba(20,184,166,0.13)]">
            <Compass className="size-10 text-teal-200" strokeWidth={1.25} />
            <span className="explorex-loader-pin absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-xl border border-amber-200/30 bg-[#1c1710] text-amber-200">
              <MapPin className="size-4" />
            </span>
          </div>
          <svg
            className="absolute inset-0 size-full overflow-visible"
            viewBox="0 0 256 256"
            fill="none"
          >
            <path
              className="explorex-loader-route"
              d="M40 166C59 182 74 116 98 132C118 145 130 166 152 133C170 105 183 83 214 92"
              stroke="url(#route-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient
                id="route-gradient"
                x1="40"
                y1="166"
                x2="214"
                y2="92"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#2dd4bf" stopOpacity=".15" />
                <stop offset=".5" stopColor="#5eead4" />
                <stop offset="1" stopColor="#7dd3fc" stopOpacity=".4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-200/80">
          Your next journey is taking shape
        </p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-white sm:text-4xl">
          Finding your way
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
          Bringing destinations, routes, and trip ideas together.
        </p>

        <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="explorex-loader-progress h-full w-2/5 rounded-full bg-gradient-to-r from-teal-300 via-teal-400 to-sky-300" />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span className="explorex-loader-dot size-1.5 rounded-full bg-teal-300" />
          ExploreX travel intelligence
        </div>
      </div>
    </main>
  );
}
