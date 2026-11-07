import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { exploreCities } from "@/lib/data/cities";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { z } from "zod";
import "server-only";

const slugSchema = z.string().trim().min(1).max(100);
const saveCityBodySchema = z.object({ slug: slugSchema }).strict();

async function writeLimit(request: Request, userId: string) {
  const policy = APP_CONFIG.rateLimits.tripWrite;
  return enforceRateLimit(request, { ...policy, userId });
}

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
    const denied = await writeLimit(request, user.id);
    if (denied) return denied;
    const parsed = saveCityBodySchema.safeParse(await readJsonObject(request));
    if (!parsed.success)
      return apiError("A valid city slug is required", 400, "VALIDATION_ERROR");
    const { slug } = parsed.data;
    const city = exploreCities.find((item) => item.slug === slug);
    if (!city) return apiError("City guide not found", 404, "NOT_FOUND");
    const saved = await prisma.$transaction(async (tx) => {
      await tx.cityGuide.upsert({
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
      return tx.savedCity.upsert({
        where: { userId_citySlug: { userId: user.id, citySlug: slug } },
        update: {},
        create: { userId: user.id, citySlug: slug },
        select: { citySlug: true, createdAt: true },
      });
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
    const denied = await writeLimit(request, user.id);
    if (denied) return denied;
    const params = new URL(request.url).searchParams;
    if (params.size !== 1 || params.getAll("slug").length !== 1)
      return apiError("A city slug is required", 400, "VALIDATION_ERROR");
    const parsed = slugSchema.safeParse(params.get("slug"));
    if (!parsed.success)
      return apiError("A city slug is required", 400, "VALIDATION_ERROR");
    const slug = parsed.data;
    await prisma.savedCity.deleteMany({
      where: { userId: user.id, citySlug: slug },
    });
    return apiOk({ slug, removed: true });
  } catch (error) {
    return serverError(error, "Unable to remove saved city");
  }
}
