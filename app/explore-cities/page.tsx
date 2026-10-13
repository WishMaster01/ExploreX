import { ExploreCitiesClient } from "./ExploreCitiesClient";

export const metadata = {
  title: "Explore Cities | ExploreX Travel Intelligence",
  description:
    "Browse destination guides with attractions, estimated costs, seasons, transit, and practical travel information.",
};

export default async function ExploreCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <ExploreCitiesClient initialQuery={q ?? ""} />;
}
