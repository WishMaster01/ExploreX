import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { DiscoveryModerationStatus } from "@/lib/generated/prisma/client";
import { z } from "zod";
import "server-only";

const schema = z
  .object({
    tripId: z.string().min(1),
    discoveryId: z.string().min(1),
    satisfaction: z.number().int().min(1).max(5).optional(),
    preferenceMatch: z.number().int().min(1).max(5).optional(),
    writtenFeedback: z.string().trim().max(1000).optional(),
    visitReported: z.boolean().default(false),
    consentToPublish: z.boolean().default(false),
  })
  .strict()
  .refine(
    (value) =>
      value.satisfaction !== undefined ||
      value.preferenceMatch !== undefined ||
      Boolean(value.writtenFeedback) ||
      value.visitReported,
    "Feedback must contain a signal",
  );
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
    const parsed = schema.safeParse(await readJsonObject(request));
    if (!parsed.success)
      return apiError(
        "A valid optional feedback entry is required",
        400,
        "VALIDATION_ERROR",
      );
    const { tripId, discoveryId, ...feedback } = parsed.data;
    const [trip, discovery] = await Promise.all([
      prisma.trip.findFirst({
        where: { id: tripId, userId: user.id },
        select: { plan: true },
      }),
      prisma.communityDiscovery.findFirst({
        where: {
          id: discoveryId,
          moderationStatus: DiscoveryModerationStatus.APPROVED,
        },
        select: { title: true },
      }),
    ]);
    if (!trip || !discovery)
      return apiError("Trip or discovery not found", 404, "NOT_FOUND");
    // Only request feedback for places actually present in this user's saved itinerary.
    if (
      JSON.stringify(trip.plan ?? {})
        .toLocaleLowerCase()
        .includes(discovery.title.toLocaleLowerCase()) === false
    )
      return apiError(
        "Feedback is only available for experiences in this itinerary",
        403,
        "FORBIDDEN",
      );
    const saved = await prisma.discoveryFeedback.upsert({
      where: {
        discoveryId_userId_tripId: { discoveryId, userId: user.id, tripId },
      },
      update: feedback,
      create: { discoveryId, userId: user.id, tripId, ...feedback },
    });
    return apiOk({ feedbackId: saved.id, recorded: true });
  } catch (error) {
    return serverError(error, "Unable to save discovery feedback");
  }
}
