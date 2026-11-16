import type { Metadata } from "next";
import { SharedTrip } from "./shared-trip";

export const metadata: Metadata = {
  title: "Shared itinerary | ExploreX",
  robots: { index: false, follow: false },
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedTrip token={token} />;
}
