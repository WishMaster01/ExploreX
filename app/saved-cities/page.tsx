import { SavedCities } from "@/app/_components/SavedCities";

export const metadata = {
  title: "Saved Cities | ExploreX Travel Intelligence",
  description: "Your bookmarked city guides and destination inspiration.",
  robots: { index: false, follow: false },
};

export default function SavedCitiesPage() {
  return <SavedCities />;
}
