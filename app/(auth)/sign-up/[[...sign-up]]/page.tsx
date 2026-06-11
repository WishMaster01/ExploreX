import { SignUp } from "@clerk/nextjs";
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
            Start your journey
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-slate-900">
            Create a premium AI travel workspace.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Save trips, compare itineraries, invite collaborators, and personalize plans by budget and travel style.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {["AI copilot", "Smart packing", "Trip sharing", "Map routes"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card flex justify-center rounded-2xl p-6 shadow-[var(--shadow-elevated)]">
          <SignUp />
        </div>
      </div>
    </div>
  );
}
