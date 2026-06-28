import UserTrips from "@/app/_components/UserTrips";

export const metadata = {
  title: "Saved Trips | ExploreX",
  description: "Search, sort, favorite, revisit, and manage saved ExploreX itineraries.",
};

export default function SavedTripsPage() {
  return <div className="min-h-[75vh] px-4 pb-20 pt-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><UserTrips /></div></div>;
}

