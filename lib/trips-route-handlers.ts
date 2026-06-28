import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  apiError,
  apiOk,
  boundedString,
  readJsonObject,
  serverError,
} from "@/lib/api";
import { tripInfoSchema } from "@/lib/ai-schemas";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseMoney } from "@/lib/algorithms/recommendation/weighted-scoring";
import {
  cosineSimilarity,
  textVector,
} from "@/lib/algorithms/recommendation/cosine-similarity";

const tripSelect = {
  id: true,
  budget: true,
  budgetAmount: true,
  destination: true,
  duration: true,
  durationDays: true,
  groupSize: true,
  origin: true,
  isFavorite: true,
  lastViewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TripSelect;

function integerFromText(value: string): number | null {
  const number = Number(value.match(/\d+/)?.[0]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function safeMoney(value: string): number | null {
  const amount = Math.round(parseMoney(value));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 2_000_000_000
    ? amount
    : null;
}

function rateLimit(request: Request, userId: string, write = false) {
  return enforceRateLimit(request, {
    capacity: write ? 20 : 120,
    interval: 3600,
    refillRate: write ? 10 : 60,
    requested: 1,
    userId,
  });
}

export async function tripsPost(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body)
      return apiError("Request body must be a JSON object", 400, "BAD_REQUEST");
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await rateLimit(request, user.id, true);
    if (denied) return denied;

    if (!body.plan) return apiError("plan is required", 400, "BAD_REQUEST");
    const serialized = JSON.stringify(body.plan);
    if (serialized.length > 200_000)
      return apiError("plan is too large", 400, "BAD_REQUEST");
    const parsed = tripInfoSchema.safeParse(body.plan);
    if (!parsed.success)
      return apiError(
        "plan does not match the trip schema",
        400,
        "BAD_REQUEST",
      );
    const plan = parsed.data;
    const planHash = createHash("sha256")
      .update(JSON.stringify(plan))
      .digest("hex");
    const existing = await prisma.trip.findUnique({
      where: { userId_planHash: { userId: user.id, planHash } },
      select: tripSelect,
    });
    if (existing) {
      const refreshed = await prisma.trip.update({
        where: { id: existing.id },
        data: { lastViewedAt: new Date() },
        select: tripSelect,
      });
      return apiOk({ ...refreshed, deduplicated: true });
    }

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          budget: boundedString(plan.budget, 80) || null,
          budgetAmount: safeMoney(plan.budget),
          destination: boundedString(plan.destination, 160),
          duration: boundedString(plan.duration, 80) || null,
          durationDays: integerFromText(plan.duration),
          groupSize: boundedString(plan.group_size, 80) || null,
          origin: boundedString(plan.origin, 160) || null,
          plan: plan as Prisma.InputJsonValue,
          planHash,
          userId: user.id,
          hotels: {
            create: plan.hotels.map((hotel) => ({
              name: hotel.hotel_name,
              pricePerNight: hotel.price_per_night,
              rating: hotel.rating,
            })),
          },
          itineraryItems: {
            create: plan.itinerary.map((day) => ({
              day: day.day,
              activities: day.activities.map((activity) => activity.place_name),
            })),
          },
        },
        select: tripSelect,
      });
      await tx.analyticsEvent.create({
        data: {
          type: "trip_generated",
          destination: plan.destination,
          userId: user.id,
          metadata: {
            budget: plan.budget,
            durationDays: integerFromText(plan.duration),
          },
        },
      });
      return created;
    });
    return apiOk(trip, 201);
  } catch (error) {
    return serverError(error, "Error creating trip");
  }
}

export async function tripsGet(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await rateLimit(request, user.id);
    if (denied) return denied;
    const url = new URL(request.url);
    const advanced = url.searchParams.size > 0;
    const take = Math.min(
      30,
      Math.max(
        1,
        Number(url.searchParams.get("limit") ?? (advanced ? 12 : 50)) || 12,
      ),
    );
    const cursor = boundedString(url.searchParams.get("cursor"), 100);
    const search = boundedString(url.searchParams.get("search"), 100);
    const sort = url.searchParams.get("sort") ?? "recent";
    const favorite = url.searchParams.get("favorite") === "true";
    const similarTo = boundedString(url.searchParams.get("similarTo"), 100);
    const orderBy: Prisma.TripOrderByWithRelationInput[] =
      sort === "budget"
        ? [{ budgetAmount: "asc" }, { id: "asc" }]
        : sort === "duration"
          ? [{ durationDays: "asc" }, { id: "asc" }]
          : sort === "destination"
            ? [{ destination: "asc" }, { id: "asc" }]
            : [{ createdAt: "desc" }, { id: "desc" }];

    const trips = await prisma.trip.findMany({
      where: {
        userId: user.id,
        ...(favorite ? { isFavorite: true } : {}),
        ...(search
          ? { destination: { contains: search, mode: "insensitive" } }
          : {}),
      },
      orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: tripSelect,
    });
    const hasMore = trips.length > take;
    const page = trips.slice(0, take);
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;
    let items = page
      .map((trip) => ({
        ...trip,
        similarityScore: undefined as number | undefined,
      }));
    if (similarTo) {
      const reference = await prisma.trip.findFirst({
        where: { id: similarTo, userId: user.id },
        select: {
          destination: true,
          budget: true,
          duration: true,
          groupSize: true,
        },
      });
      if (reference) {
        const vocabulary = [
          "solo",
          "couple",
          "family",
          "friends",
          "low",
          "medium",
          "high",
          "beach",
          "city",
          "mountain",
          "culture",
          "food",
        ];
        const referenceVector = textVector(
          Object.values(reference).filter(Boolean).join(" "),
          vocabulary,
        );
        items = items
          .map((trip) => ({
            ...trip,
            similarityScore: cosineSimilarity(
              referenceVector,
              textVector(
                `${trip.destination} ${trip.budget} ${trip.duration} ${trip.groupSize}`,
                vocabulary,
              ),
            ),
          }))
          .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0));
      }
    }
    if (!advanced) return apiOk(items);
    return apiOk({
      items,
      nextCursor,
    });
  } catch (error) {
    return serverError(error, "Error fetching trips");
  }
}

export async function tripsPatch(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await rateLimit(request, user.id, true);
    if (denied) return denied;
    const body = await readJsonObject(request);
    const id = boundedString(body?.id, 100);
    if (!id) return apiError("id is required", 400, "BAD_REQUEST");
    const existing = await prisma.trip.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return apiError("Trip not found", 404, "NOT_FOUND");
    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(typeof body?.isFavorite === "boolean"
          ? { isFavorite: body.isFavorite }
          : {}),
        ...(body?.viewed === true ? { lastViewedAt: new Date() } : {}),
      },
      select: tripSelect,
    });
    return apiOk(trip);
  } catch (error) {
    return serverError(error, "Error updating trip");
  }
}

export async function tripsDelete(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await rateLimit(request, user.id, true);
    if (denied) return denied;
    const id = boundedString(new URL(request.url).searchParams.get("id"), 100);
    if (!id) return apiError("id is required", 400, "BAD_REQUEST");
    const result = await prisma.trip.deleteMany({
      where: { id, userId: user.id },
    });
    if (!result.count) return apiError("Trip not found", 404, "NOT_FOUND");
    return apiOk({ deleted: true });
  } catch (error) {
    return serverError(error, "Error deleting trip");
  }
}
