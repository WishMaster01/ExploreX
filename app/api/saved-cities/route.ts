import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { exploreCities } from "@/lib/data/cities";
import { prisma } from "@/lib/db";
import "server-only";

export async function GET() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const saved = await prisma.savedCity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        citySlug: true,
        createdAt: true,
        city: { select: { content: true } },
      },
    });
    return apiOk({
      savedCities: saved.flatMap(({ citySlug, createdAt, city }) => {
        const guide =
          (city.content as (typeof exploreCities)[number] | null) ??
          exploreCities.find((item) => item.slug === citySlug);
        return guide ? [{ ...guide, createdAt: createdAt.toISOString() }] : [];
      }),
    });
  } catch (error) {
    return serverError(error, "Unable to load saved cities");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const body = await readJsonObject(request);
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const city = exploreCities.find((item) => item.slug === slug);
    if (!city) return apiError("City guide not found", 404, "NOT_FOUND");
    await prisma.cityGuide.upsert({
      where: { slug },
      update: {
        name: city.name,
        country: city.country,
        region: city.region,
        content: city,
      },
      create: {
        slug,
        name: city.name,
        country: city.country,
        region: city.region,
        content: city,
      },
    });
    const saved = await prisma.savedCity.upsert({
      where: { userId_citySlug: { userId: user.id, citySlug: slug } },
      update: {},
      create: { userId: user.id, citySlug: slug },
      select: { citySlug: true, createdAt: true },
    });
    return apiOk({
      slug: saved.citySlug,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (error) {
    return serverError(error, "Unable to save city");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const slug = new URL(request.url).searchParams.get("slug")?.trim();
    if (!slug || slug.length > 100)
      return apiError("A city slug is required", 400, "VALIDATION_ERROR");
    await prisma.savedCity.deleteMany({
      where: { userId: user.id, citySlug: slug },
    });
    return apiOk({ slug, removed: true });
  } catch (error) {
    return serverError(error, "Unable to remove saved city");
  }
}
