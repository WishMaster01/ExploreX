import { apiError, apiOk, serverError } from "@/lib/api";
import { Prisma } from "@/lib/generated/prisma/client";
import { topK } from "@/lib/algorithms/analytics/top-k";
import { isAdmin } from "@/lib/admin";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { serverLogger } from "@/lib/observability/server-logger";
import "server-only";

async function handleGet(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");

    if (!isAdmin(user))
      return apiError("Admin access is required", 403, "FORBIDDEN");

    const denied = await enforceRateLimit(request, {
      capacity: 60,
      interval: 3600,
      refillRate: 30,
      userId: user.id,
    });
    if (denied) return denied;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const queryStartedAt = performance.now();
    const [eventGroups, destinationGroups, activeUsers, totalTrips, aiUsage] =
      await Promise.all([
        prisma.analyticsEvent.groupBy({
          by: ["type", "success"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        prisma.analyticsEvent.groupBy({
          by: ["destination"],
          where: { createdAt: { gte: since }, destination: { not: null } },
          _count: { _all: true },
        }),
        prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          SELECT COUNT(DISTINCT "userId") AS count
          FROM "analytics_events"
          WHERE "createdAt" >= ${since} AND "userId" IS NOT NULL
        `),
        prisma.trip.count({ where: { createdAt: { gte: since } } }),
        prisma.$queryRaw<
          Array<{
            requests: bigint;
            successes: bigint;
            failures: bigint;
            promptTokens: string | null;
            completionTokens: string | null;
            estimatedCostUsd: string | null;
            costSamples: bigint;
            averageLatencyMs: number | null;
            cacheHits: bigint;
          }>
        >(Prisma.sql`
          SELECT
            COUNT(*) AS requests,
            COUNT(*) FILTER (WHERE "success" = true) AS successes,
            COUNT(*) FILTER (WHERE "success" = false) AS failures,
            COALESCE(SUM(CASE WHEN "metadata"->>'promptTokens' ~ '^[0-9]+$'
              THEN ("metadata"->>'promptTokens')::numeric ELSE 0 END), 0)::text AS "promptTokens",
            COALESCE(SUM(CASE WHEN "metadata"->>'completionTokens' ~ '^[0-9]+$'
              THEN ("metadata"->>'completionTokens')::numeric ELSE 0 END), 0)::text AS "completionTokens",
            COALESCE(SUM(CASE WHEN "metadata"->>'estimatedCostUsd' ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN ("metadata"->>'estimatedCostUsd')::numeric ELSE 0 END), 0)::text AS "estimatedCostUsd",
            COUNT(*) FILTER (WHERE "metadata"->>'estimatedCostUsd' ~ '^[0-9]+(\\.[0-9]+)?$') AS "costSamples",
            AVG(CASE WHEN "metadata"->>'latencyMs' ~ '^[0-9]+$'
              AND COALESCE("metadata"->>'cacheHit', 'false') <> 'true'
              THEN ("metadata"->>'latencyMs')::numeric END)::float8 AS "averageLatencyMs",
            COUNT(*) FILTER (WHERE "metadata"->>'cacheHit' = 'true') AS "cacheHits"
          FROM "analytics_events"
          WHERE "createdAt" >= ${since}
            AND "type" IN ('ai_generation', 'ai_feature')
        `),
      ]);
    serverLogger.info("db.admin_analytics.completed", {
      latencyMs: Math.round(performance.now() - queryStartedAt),
      windowDays: 30,
      queryCount: 5,
    });
    const usage = aiUsage[0];

    const popularDestinations = topK(
      destinationGroups,
      (item) => item._count._all,
      10,
    ).map((item) => ({
      destination: item.destination,
      count: item._count._all,
    }));
    return apiOk({
      windowDays: 30,
      activeUsers: Number(activeUsers[0]?.count ?? 0),
      totalTrips,
      aiUsage: {
        requests: Number(usage?.requests ?? 0),
        successes: Number(usage?.successes ?? 0),
        failures: Number(usage?.failures ?? 0),
        successRate: Number(usage?.requests ?? 0)
          ? Number(usage?.successes ?? 0) / Number(usage?.requests ?? 0)
          : 0,
        promptTokens: Number(usage?.promptTokens ?? 0),
        completionTokens: Number(usage?.completionTokens ?? 0),
        estimatedCostUsd: Number(usage?.costSamples ?? 0)
          ? Number(usage?.estimatedCostUsd ?? 0)
          : null,
        averageLatencyMs: usage?.averageLatencyMs ?? 0,
        cacheHits: Number(usage?.cacheHits ?? 0),
      },
      events: eventGroups.map((event) => ({
        type: event.type,
        success: event.success,
        count: event._count._all,
      })),
      popularDestinations,
    });
  } catch (error) {
    return serverError(error, "Error fetching admin analytics");
  }
}

export function GET(request: Request) {
  return withRequestMetrics(request, "GET /api/admin/analytics", () =>
    handleGet(request),
  );
}
