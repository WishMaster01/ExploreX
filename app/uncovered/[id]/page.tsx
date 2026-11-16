import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoveryDetail } from "./discovery-detail";

export const metadata: Metadata = {
  title: "Community discovery | ExploreX",
  robots: { index: false, follow: false },
};

export default async function DiscoveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) notFound();
  return <DiscoveryDetail id={id} />;
}
