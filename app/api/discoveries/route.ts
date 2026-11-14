import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  discoveryDraftSchema,
  findDuplicate,
  publicDiscoveryLocation,
  rankDiscovery,
  submissionLimitReached,
} from "@/lib/community/policy";
import { APP_CONFIG } from "@/lib/config";
import {
  DiscoveryModerationStatus,
  DiscoverySignalType,
} from "@/lib/generated/prisma/client";
import "server-only";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) => !["destination", "category", "interests"].includes(key),
      )
    )
      return apiError("Unsupported query parameter", 400, "VALIDATION_ERROR");
    const destinationId = params.get("destination");
    const category = params.get("category");
    const interestsParam = params.get("interests") ?? "";
    const interests = interestsParam
      .split(",")
      .map((item) => item.trim().toLocaleLowerCase("en"))
      .filter((item) => /^[a-z][a-z0-9_-]{0,49}$/.test(item))
      .slice(0, 10);
    const rows = await prisma.communityDiscovery.findMany({
      where: {
        moderationStatus: DiscoveryModerationStatus.APPROVED,
        ...(destinationId ? { destinationId } : {}),
        ...(category ? { category } : {}),
      },
      take: 100,
      orderBy: { submittedAt: "desc" },
      include: {
        _count: { select: { savedBy: true } },
        signals: { select: { type: true, userId: true } },
        feedback: {
          where: { consentToPublish: true },
          select: {
            satisfaction: true,
            preferenceMatch: true,
            visitReported: true,
          },
        },
      },
    });
    const discoveries = rows
      .map((row) => {
        const location = publicDiscoveryLocation(row);
        const satisfaction = row.feedback.flatMap((item) =>
          item.satisfaction === null ? [] : [item.satisfaction],
        );
        const preferenceMatches = row.feedback.flatMap((item) =>
          item.preferenceMatch === null ? [] : [item.preferenceMatch],
        );
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          destinationId: row.destinationId,
          category: row.category,
          ...location,
          estimatedCostMinor: row.estimatedCostMinor,
          currencyCode: row.currencyCode,
          durationMinutes: row.durationMinutes,
          sourceUrl: row.sourceUrl,
          accessRestrictions: row.accessRestrictions,
          sensitiveLocation: row.sensitiveLocation,
          commercialRelationship: row.commercialRelationship,
          trustSignals: {
            communitySubmitted: true,
            sourceCorroborated: row.sourceCorroborated,
            visitEvidenceSupplied: false,
            visitReported: row.signals.some(
              (item) => item.type === DiscoverySignalType.VISIT_REPORTED,
            ),
            communityCorroborated:
              new Set(
                row.signals
                  .filter(
                    (item) => item.type === DiscoverySignalType.RECOMMENDATION,
                  )
                  .map((item) => item.userId),
              ).size >= 2,
            moderatorReviewed: Boolean(row.moderatedAt),
          },
          ratings: {
            consentedSatisfactionAverage: satisfaction.length
              ? satisfaction.reduce((a, b) => a + b, 0) / satisfaction.length
              : null,
            consentedPreferenceMatchAverage: preferenceMatches.length
              ? preferenceMatches.reduce((a, b) => a + b, 0) /
                preferenceMatches.length
              : null,
            consentedCount: satisfaction.length,
          },
          preferenceMatched: interests.includes(
            row.category.toLocaleLowerCase("en"),
          ),
          rankingScore: rankDiscovery(
            {
              category: row.category,
              savedCount: row._count.savedBy,
              recommendationCount: row.signals.filter(
                (item) => item.type === DiscoverySignalType.RECOMMENDATION,
              ).length,
              reportedVisitCount: row.signals.filter(
                (item) => item.type === DiscoverySignalType.VISIT_REPORTED,
              ).length,
              satisfactionAverage: satisfaction.length
                ? satisfaction.reduce((a, b) => a + b, 0) / satisfaction.length
                : null,
              inaccurateReportCount: 0,
              submittedAt: row.submittedAt,
            },
            interests,
          ),
          submittedAt: row.submittedAt.toISOString(),
        };
      })
      .sort((a, b) => b.rankingScore - a.rankingScore);
    return apiOk({ discoveries });
  } catch (error) {
    return serverError(error, "Unable to load discoveries");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      ...APP_CONFIG.rateLimits.tripWrite,
      userId: user.id,
    });
    if (denied) return denied;
    const parsed = discoveryDraftSchema.safeParse(
      await readJsonObject(request),
    );
    if (!parsed.success)
      return apiError(
        "Discovery details or publication consent are invalid",
        400,
        "VALIDATION_ERROR",
      );
    const recent = await prisma.communityDiscovery.count({
      where: {
        contributorId: user.id,
        submittedAt: { gte: new Date(Date.now() - 86_400_000) },
      },
    });
    if (submissionLimitReached(recent))
      return apiError("Daily submission limit reached", 429, "RATE_LIMITED");
    const possible = await prisma.communityDiscovery.findMany({
      where: {
        destinationId: parsed.data.destinationId,
        category: parsed.data.category,
        moderationStatus: {
          in: [
            DiscoveryModerationStatus.PENDING,
            DiscoveryModerationStatus.APPROVED,
          ],
        },
      },
      select: { id: true, title: true, destinationId: true, category: true },
      take: 500,
    });
    const duplicate = findDuplicate(parsed.data, possible);
    if (duplicate)
      return apiError(
        `A similar discovery already exists (${duplicate.id})`,
        409,
        "CONFLICT",
      );
    const created = await prisma.communityDiscovery.create({
      data: { ...parsed.data, contributorId: user.id },
      select: { id: true, moderationStatus: true, submittedAt: true },
    });
    return apiOk({ discovery: created }, 201);
  } catch (error) {
    return serverError(error, "Unable to submit discovery");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const body = await readJsonObject(request);
    const id = typeof body?.id === "string" ? body.id : "";
    const parsed = discoveryDraftSchema.safeParse(
      body &&
        Object.fromEntries(
          Object.entries(body).filter(([key]) => key !== "id"),
        ),
    );
    if (!id || !parsed.success)
      return apiError(
        "A valid discovery update is required",
        400,
        "VALIDATION_ERROR",
      );
    const result = await prisma.communityDiscovery.updateMany({
      where: {
        id,
        contributorId: user.id,
        moderationStatus: {
          in: [
            DiscoveryModerationStatus.PENDING,
            DiscoveryModerationStatus.CORRECTION_REQUESTED,
          ],
        },
      },
      data: {
        ...parsed.data,
        sourceCorroborated: false,
        moderationStatus: DiscoveryModerationStatus.PENDING,
        moderatorId: null,
        moderatedAt: null,
        moderatorNote: null,
      },
    });
    return result.count
      ? apiOk({ id, moderationStatus: "PENDING" })
      : apiError(
          "Discovery is unavailable or cannot be edited",
          404,
          "NOT_FOUND",
        );
  } catch (error) {
    return serverError(error, "Unable to update discovery");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return apiError("Discovery id is required", 400, "VALIDATION_ERROR");
    const result = await prisma.communityDiscovery.deleteMany({
      where: { id, contributorId: user.id },
    });
    return result.count
      ? apiOk({ id, deleted: true })
      : apiError("Discovery not found", 404, "NOT_FOUND");
  } catch (error) {
    return serverError(error, "Unable to delete discovery");
  }
}
