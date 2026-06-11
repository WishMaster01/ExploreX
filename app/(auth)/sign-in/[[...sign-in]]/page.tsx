import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function Page() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="travel-page-bg min-h-screen px-4 pt-28">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <div className="hidden lg:block">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700">
            Welcome back
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-slate-900">
            Continue planning your next intelligent trip.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Access saved itineraries, budgets, destination intelligence, and AI route recommendations.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {["Saved trips", "AI insights", "Route optimizer", "Budget planner"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card flex justify-center rounded-2xl p-6 shadow-[var(--shadow-elevated)]">
          <SignIn />
        </div>
      </div>
    </div>
  );
}
