import { apiError, apiOk, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { publicDiscoveryLocation } from "@/lib/community/policy";
import { DiscoveryModerationStatus } from "@/lib/generated/prisma/client";
import "server-only";

export async function GET() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const saved = await prisma.savedDiscovery.findMany({
      where: {
        userId: user.id,
        discovery: { moderationStatus: DiscoveryModerationStatus.APPROVED },
      },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        discovery: {
          select: {
            id: true,
            title: true,
            description: true,
            destinationId: true,
            category: true,
            locationLabel: true,
            sensitiveLocation: true,
            commercialRelationship: true,
          },
        },
      },
    });
    return apiOk({
      savedDiscoveries: saved.map((item) => ({
        ...item.discovery,
        ...publicDiscoveryLocation({
          ...item.discovery,
          latitude: null,
          longitude: null,
        }),
        savedAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return serverError(error, "Unable to load saved discoveries");
  }
}
