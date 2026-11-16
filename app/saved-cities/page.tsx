import { SavedPlaces } from "@/app/_components/SavedPlaces";

export const metadata = {
  title: "Saved Places | ExploreX Travel Intelligence",
  description: "Your saved, approved community discoveries.",
  robots: { index: false, follow: false },
};

export default function SavedPlacesPage() {
  return <SavedPlaces />;
}
