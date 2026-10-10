import { createHash } from "node:crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  apiError,
  apiOk,
  boundedString,
  readJsonObject,
  serverError,
} from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseMoney } from "@/lib/algorithms/recommendation/weighted-scoring";
import {
  cosineSimilarity,
  textVector,
} from "@/lib/algorithms/recommendation/cosine-similarity";
import { APP_CONFIG } from "@/lib/config";
import {
  parseTripListQuery,
  savedTripSchema,
  tripDeleteQuerySchema,
  tripPatchSchema,
} from "@/lib/domain/schemas";
import "server-only";
import { ownedTripWhere } from "@/lib/domain/ownership";

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

function toMinorUnits(
  amount: number | null | undefined,
  currencyCode?: string,
): number | null {
  if (amount === null || amount === undefined || !currencyCode) return null;
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits;
    const minor = Math.round(amount * 10 ** (digits ?? 2));
    return Number.isSafeInteger(minor) && minor >= 0 && minor <= 2_147_483_647
      ? minor
      : null;
  } catch {
    return null;
  }
}

function rateLimit(request: Request, userId: string, write = false) {
  const policy = write
    ? APP_CONFIG.rateLimits.tripWrite
    : APP_CONFIG.rateLimits.tripRead;
  return enforceRateLimit(request, {
    capacity: policy.capacity,
    interval: policy.interval,
    refillRate: policy.refillRate,
    requested: 1,
    userId,
  });
}

export async function tripsPost(request: Request) {
  let authenticatedUserId: string | null = null;
  let requestedPlanHash: string | null = null;
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    authenticatedUserId = user.id;
    const denied = await rateLimit(request, user.id, true);
    if (denied) return denied;
    const body = await readJsonObject(request);
    if (!body)
      return apiError("Request body must be a JSON object", 400, "BAD_REQUEST");

    if (!body.plan) return apiError("plan is required", 400, "BAD_REQUEST");
    const serialized = JSON.stringify(body.plan);
    if (serialized.length > 200_000)
      return apiError("plan is too large", 400, "BAD_REQUEST");
    const parsed = savedTripSchema.safeParse(body.plan);
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
    requestedPlanHash = planHash;
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
          budgetAmountMinor: toMinorUnits(
            parseMoney(plan.budget),
            plan.currency_code,
          ),
          budgetCurrencyCode: plan.currency_code ?? null,
          destination: boundedString(plan.destination, 160),
          duration: boundedString(plan.duration, 80) || null,
          durationDays: integerFromText(plan.duration),
          groupSize: boundedString(plan.group_size, 80) || null,
          origin: boundedString(plan.origin, 160) || null,
          plan,
          planHash,
          userId: user.id,
          hotels: {
            create: plan.hotels.map((hotel) => ({
              name: hotel.hotel_name,
              address: hotel.hotel_address,
              imageUrl: hotel.hotel_image_url || null,
              latitude: hotel.geo_coordinates.latitude,
              longitude: hotel.geo_coordinates.longitude,
              description: hotel.description,
              pricePerNight: hotel.price_per_night,
              priceAmountMinor: toMinorUnits(
                parseMoney(hotel.price_per_night),
                plan.currency_code,
              ),
              currencyCode: plan.currency_code ?? null,
              rating: hotel.rating,
              recommendationScore: hotel.recommendation_score ?? null,
            })),
          },
          days: {
            create: plan.itinerary.map((day) => ({
              dayNumber: day.day,
              title: day.day_plan,
              bestTime: day.best_time_to_visit_day || null,
              activities: {
                create: day.activities.map((activity, position) => ({
                  position,
                  placeName: activity.place_name,
                  details: activity.place_details,
                  imageUrl: activity.place_image_url || null,
                  latitude: activity.geo_coordinates.latitude,
                  longitude: activity.geo_coordinates.longitude,
                  address: activity.place_address,
                  ticketPricing: activity.ticket_pricing || null,
                  estimatedCostMinor: toMinorUnits(
                    activity.estimated_cost,
                    plan.currency_code,
                  ),
                  currencyCode: plan.currency_code ?? null,
                  travelTime: activity.time_travel_each_location || null,
                  bestTime: activity.best_time_to_visit || null,
                  openingTime: activity.opening_time || null,
                  closingTime: activity.closing_time || null,
                  visitDurationMinutes: activity.visit_duration_minutes ?? null,
                  scheduledStart: activity.scheduled_start ?? null,
                  scheduledEnd: activity.scheduled_end ?? null,
                  distanceFromPreviousKm:
                    activity.distance_from_previous_km ?? null,
                })),
              },
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      authenticatedUserId &&
      requestedPlanHash
    ) {
      const duplicate = await prisma.trip.findUnique({
        where: {
          userId_planHash: {
            userId: authenticatedUserId,
            planHash: requestedPlanHash,
          },
        },
        select: tripSelect,
      });
      if (duplicate) {
        const refreshed = await prisma.trip.update({
          where: { id: duplicate.id, userId: authenticatedUserId },
          data: { lastViewedAt: new Date() },
          select: tripSelect,
        });
        return apiOk({ ...refreshed, deduplicated: true });
      }
    }
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
    const query = parseTripListQuery(url.searchParams);
    if (!query)
      return apiError(
        "Trip query parameters are invalid",
        400,
        "VALIDATION_ERROR",
      );
    const advanced = url.searchParams.size > 0;
    const take = Math.min(
      APP_CONFIG.pagination.maxTrips,
      query.limit ?? (advanced ? APP_CONFIG.pagination.defaultTrips : 50),
    );
    const { cursor, search, sort, favorite, similarTo } = query;
    if (cursor) {
      const ownedCursor = await prisma.trip.findFirst({
        where: ownedTripWhere(user.id, cursor),
        select: { id: true },
      });
      if (!ownedCursor)
        return apiError("Trip cursor not found", 400, "VALIDATION_ERROR");
    }
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
        ...ownedTripWhere(user.id),
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
    let items = page.map((trip) => ({
      ...trip,
      similarityScore: undefined as number | undefined,
    }));
    if (similarTo) {
      const reference = await prisma.trip.findFirst({
        where: ownedTripWhere(user.id, similarTo),
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
    const parsed = tripPatchSchema.safeParse(await readJsonObject(request));
    if (!parsed.success)
      return apiError(
        "A valid trip update is required",
        400,
        "VALIDATION_ERROR",
      );
    const { id, isFavorite, viewed } = parsed.data;
    const updated = await prisma.trip.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(isFavorite !== undefined ? { isFavorite } : {}),
        ...(viewed === true ? { lastViewedAt: new Date() } : {}),
      },
    });
    if (!updated.count) return apiError("Trip not found", 404, "NOT_FOUND");
    const trip = await prisma.trip.findFirst({
      where: ownedTripWhere(user.id, id),
      select: tripSelect,
    });
    if (!trip) return apiError("Trip not found", 404, "NOT_FOUND");
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
    const params = new URL(request.url).searchParams;
    if (params.size !== 1 || params.getAll("id").length !== 1)
      return apiError("Trip delete query is invalid", 400, "VALIDATION_ERROR");
    const parsed = tripDeleteQuerySchema.safeParse({ id: params.get("id") });
    if (!parsed.success)
      return apiError("A valid trip id is required", 400, "VALIDATION_ERROR");
    const { id } = parsed.data;
    const result = await prisma.trip.deleteMany({
      where: ownedTripWhere(user.id, id),
    });
    if (!result.count) return apiError("Trip not found", 404, "NOT_FOUND");
    return apiOk({ deleted: true });
  } catch (error) {
    return serverError(error, "Error deleting trip");
  }
}
