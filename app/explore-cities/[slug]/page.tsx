import { getExploreCity, exploreCities } from "@/lib/data/cities";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityDetailHUD } from "./CityDetailHUD";
import { prisma } from "@/lib/db";
import "server-only";

export const dynamic = "force-dynamic";

async function loadCity(slug: string) {
  try {
    const record = await prisma.cityGuide.findUnique({
      where: { slug },
      select: { content: true },
    });
    if (
      record?.content &&
      typeof record.content === "object" &&
      !Array.isArray(record.content)
    ) {
      return record.content as (typeof exploreCities)[number];
    }
  } catch {
    // Keep curated pages available while a local database is not configured.
  }
  return getExploreCity(slug);
}

type CityPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return exploreCities.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const city = await loadCity((await params).slug);
  return city
    ? {
        title: `${city.name} Travel Guide | ExploreX`,
        description: `${city.tagline} — ${city.summary}`,
      }
    : {};
}

export default async function CityDetailPage({ params }: CityPageProps) {
  const city = await loadCity((await params).slug);
  if (!city) notFound();

  return <CityDetailHUD city={city} />;
}
