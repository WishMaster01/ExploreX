import UserTrips from "@/app/_components/UserTrips";

export const metadata = {
  title: "Saved Trips | ExploreX Travel Intelligence",
  description:
    "Search, sort, favorite, revisit, and manage saved ExploreX itineraries.",
};

export default function SavedTripsPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <UserTrips />
      </div>
    </div>
  );
}
