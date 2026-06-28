import { apiError, apiOk, serverError } from "@/lib/api";
import { topK } from "@/lib/algorithms/analytics/top-k";
import { isAdmin } from "@/lib/admin";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user) return apiError("Authentication is required", 401, "UNAUTHORIZED");
    if (!isAdmin(user)) return apiError("Admin access is required", 403, "FORBIDDEN");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [eventGroups, destinationGroups, activeUsers, totalTrips] = await Promise.all([
      prisma.analyticsEvent.groupBy({ by: ["type", "success"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({ by: ["destination"], where: { createdAt: { gte: since }, destination: { not: null } }, _count: { _all: true } }),
      prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
      prisma.trip.count({ where: { createdAt: { gte: since } } }),
    ]);
    const popularDestinations = topK(destinationGroups, (item) => item._count._all, 10)
      .map((item) => ({ destination: item.destination, count: item._count._all }));
    return apiOk({
      windowDays: 30,
      activeUsers: activeUsers.length,
      totalTrips,
      events: eventGroups.map((event) => ({ type: event.type, success: event.success, count: event._count._all })),
      popularDestinations,
    });
  } catch (error) {
    return serverError(error, "Error fetching admin analytics");
  }
}

