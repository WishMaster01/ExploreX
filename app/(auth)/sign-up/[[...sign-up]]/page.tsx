import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

export default async function Page() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white px-4 pt-32 pb-20">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-orange-300">
            <Sparkles className="size-3.5" />
            Start Your Journey
          </div>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-white leading-[1.12]">
            Create a Spatial <br />
            <span className="font-handwriting text-amber-400 italic text-6xl">
              AI Travel Workspace.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Save custom trips, discover iconic cities in 3D perspective, and
            personalize itineraries by budget, pace, and travel style.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              "Spatial AI Copilot",
              "Smart Packing Assistant",
              "Saved Itineraries",
              "Geographic Route Sequences",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold tracking-wide text-slate-200 backdrop-blur-md"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center rounded-3xl border border-white/15 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
          <SignUp />
        </div>
      </div>
    </div>
  );
}
