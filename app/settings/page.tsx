import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";
import { TravelPreferencesSettings } from "@/components/travel/TravelPreferencesSettings";

export const metadata: Metadata = {
  title: "Profile and settings | ExploreX",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#080c12] px-4 pb-16 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-orange-200">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold">Profile and settings</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Manage your account with Clerk and set private travel defaults for
          this browser.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="mb-5 text-xl font-semibold">
              Profile and account security
            </h2>
            <UserProfile />
          </section>
          <TravelPreferencesSettings />
        </div>
      </div>
    </main>
  );
}
