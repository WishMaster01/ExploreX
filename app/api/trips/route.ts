import type { Prisma } from "@prisma/client";
import {
  apiError,
  apiOk,
  boundedString,
  isRecord,
  readJsonObject,
  serverError,
} from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

function normalizePlan(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  if (JSON.stringify(value).length > 200_000) {
    return null;
  }

  return value as Prisma.InputJsonValue;
}

function planString(
  body: Record<string, unknown>,
  plan: Record<string, unknown> | undefined,
  bodyKey: string,
  planKey = bodyKey,
  maxLength = 160
) {
  return boundedString(body[bodyKey], maxLength) || boundedString(plan?.[planKey], maxLength);
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object", 400, "BAD_REQUEST");
    }

    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const rateLimitResponse = await enforceRateLimit(request, {
      capacity: 20,
      interval: 3600,
      refillRate: 10,
      requested: 1,
      userId: user.id,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const plan = normalizePlan(body.plan);
    const planRecord = isRecord(body.plan) ? body.plan : undefined;
    const budget = planString(body, planRecord, "budget", "budget", 80) || null;
    const destination =
      planString(body, planRecord, "destination", "destination", 160) ||
      "Untitled trip";
    const duration = planString(body, planRecord, "duration", "duration", 80) || null;
    const groupSize =
      planString(body, planRecord, "groupSize", "group_size", 80) ||
      planString(body, planRecord, "group_size", "group_size", 80) ||
      null;
    const origin = planString(body, planRecord, "origin", "origin", 160) || null;

    if (plan === null) {
      return apiError("plan is too large", 400, "BAD_REQUEST");
    }

    if (!plan) {
      return apiError("plan is required", 400, "BAD_REQUEST");
    }

    const trip = await prisma.trip.create({
      data: {
        budget,
        destination,
        duration,
        groupSize,
        origin,
        plan,
        userId: user.id,
      },
    });

    return apiOk(trip, 201);
  } catch (error) {
    return serverError(error, "Error creating trip");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const rateLimitResponse = await enforceRateLimit(request, {
      capacity: 120,
      interval: 3600,
      refillRate: 60,
      requested: 1,
      userId: user.id,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiOk(trips);
  } catch (error) {
    return serverError(error, "Error fetching trips");
  }
}
