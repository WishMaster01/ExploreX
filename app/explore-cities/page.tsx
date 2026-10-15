import { ExploreCitiesClient } from "./ExploreCitiesClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Cities | ExploreX Travel Intelligence",
  description:
    "Browse destination guides with attractions, estimated costs, seasons, transit, and practical travel information.",
  alternates: { canonical: "/explore-cities" },
};

export default async function ExploreCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <ExploreCitiesClient initialQuery={q ?? ""} />;
}
