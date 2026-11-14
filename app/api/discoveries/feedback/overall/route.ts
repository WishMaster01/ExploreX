import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { z } from "zod";
import "server-only";

const schema = z
  .object({
    tripId: z.string().min(1),
    overallSatisfaction: z.number().int().min(1).max(5),
    writtenFeedback: z.string().trim().max(1000).optional(),
    consentToPublish: z.boolean().default(false),
  })
  .strict();
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
        "A valid optional trip feedback entry is required",
        400,
        "VALIDATION_ERROR",
      );
    const ownedTrip = await prisma.trip.findFirst({
      where: { id: parsed.data.tripId, userId: user.id },
      select: { id: true },
    });
    if (!ownedTrip) return apiError("Trip not found", 404, "NOT_FOUND");
    const feedback = await prisma.communityTripFeedback.upsert({
      where: { tripId_userId: { tripId: ownedTrip.id, userId: user.id } },
      update: {
        overallSatisfaction: parsed.data.overallSatisfaction,
        writtenFeedback: parsed.data.writtenFeedback,
        consentToPublish: parsed.data.consentToPublish,
      },
      create: { ...parsed.data, userId: user.id },
    });
    return apiOk({ feedbackId: feedback.id, recorded: true });
  } catch (error) {
    return serverError(error, "Unable to save trip feedback");
  }
}
