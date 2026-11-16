import { apiError, apiOk, serverError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { DiscoveryModerationStatus } from "@/lib/generated/prisma/client";
import { publicDiscoveryLocation } from "@/lib/community/policy";
import "server-only";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      return apiError("Discovery not found", 404, "NOT_FOUND");
    const item = await prisma.communityDiscovery.findFirst({
      where: { id, moderationStatus: DiscoveryModerationStatus.APPROVED },
      select: {
        id: true,
        title: true,
        description: true,
        destinationId: true,
        category: true,
        latitude: true,
        longitude: true,
        locationLabel: true,
        sensitiveLocation: true,
        estimatedCostMinor: true,
        currencyCode: true,
        durationMinutes: true,
        sourceUrl: true,
        accessRestrictions: true,
        sourceCorroborated: true,
        commercialRelationship: true,
        moderatedAt: true,
        signals: { select: { type: true, userId: true } },
        _count: { select: { savedBy: true } },
      },
    });
    if (!item) return apiError("Discovery not found", 404, "NOT_FOUND");
    const location = publicDiscoveryLocation(item);
    return apiOk({
      id: item.id,
      title: item.title,
      description: item.description,
      destinationId: item.destinationId,
      category: item.category,
      ...location,
      sensitiveLocation: item.sensitiveLocation,
      estimatedCostMinor: item.estimatedCostMinor,
      currencyCode: item.currencyCode,
      durationMinutes: item.durationMinutes,
      sourceUrl: item.sourceUrl,
      accessRestrictions: item.accessRestrictions,
      commercialRelationship: item.commercialRelationship,
      savedCount: item._count.savedBy,
      trustSignals: {
        communitySubmitted: true,
        sourceCorroborated: item.sourceCorroborated,
        communityCorroborated:
          new Set(
            item.signals
              .filter((signal) => signal.type === "RECOMMENDATION")
              .map((signal) => signal.userId),
          ).size >= 2,
        visitReported: item.signals.some(
          (signal) => signal.type === "VISIT_REPORTED",
        ),
        visitEvidenceSupplied: false,
        moderatorReviewed: Boolean(item.moderatedAt),
      },
    });
  } catch (error) {
    return serverError(error, "Unable to load discovery detail");
  }
}
