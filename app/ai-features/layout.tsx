import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Travel Tools | ExploreX",
  description:
    "Use ExploreX travel assistants for destination research, itinerary routes, budgeting, packing, and trip questions.",
  alternates: { canonical: "/ai-features" },
};

export default function AiFeaturesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
