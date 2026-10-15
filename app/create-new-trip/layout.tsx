import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan a Trip | ExploreX",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CreateTripLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
