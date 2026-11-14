import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { DiscoveryModerationStatus, Role } from "@/lib/generated/prisma/client";
import { z } from "zod";
import "server-only";

const actionSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(["approve", "reject", "request_correction", "remove"]),
    note: z.string().trim().max(1000).optional(),
    sourceCorroborated: z.boolean().default(false),
  })
  .strict();
export async function GET() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    if (user.role !== Role.ADMIN && !isAdmin(user))
      return apiError("Moderator access required", 403, "FORBIDDEN");
    const queue = await prisma.communityDiscovery.findMany({
      where: {
        OR: [
          {
            moderationStatus: {
              in: [
                DiscoveryModerationStatus.PENDING,
                DiscoveryModerationStatus.CORRECTION_REQUESTED,
              ],
            },
          },
          {
            signals: {
              some: { type: { in: ["REPORT", "CORRECTION_REQUEST"] } },
            },
          },
        ],
      },
      orderBy: { submittedAt: "asc" },
      take: 100,
      include: {
        signals: {
          where: { type: { in: ["REPORT", "CORRECTION_REQUEST"] } },
          select: { type: true, reason: true, createdAt: true },
        },
      },
    });
    return apiOk({ queue });
  } catch (error) {
    return serverError(error, "Unable to load moderation queue");
  }
}
export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    if (user.role !== Role.ADMIN && !isAdmin(user))
      return apiError("Moderator access required", 403, "FORBIDDEN");
    const denied = await enforceRateLimit(request, {
      ...APP_CONFIG.rateLimits.tripWrite,
      userId: user.id,
    });
    if (denied) return denied;
    const parsed = actionSchema.safeParse(await readJsonObject(request));
    if (!parsed.success)
      return apiError(
        "A valid moderation action is required",
        400,
        "VALIDATION_ERROR",
      );
    const { id, action, note, sourceCorroborated } = parsed.data;
    if (["reject", "request_correction", "remove"].includes(action) && !note)
      return apiError("A moderation note is required", 400, "VALIDATION_ERROR");
    const status = {
      approve: DiscoveryModerationStatus.APPROVED,
      reject: DiscoveryModerationStatus.REJECTED,
      request_correction: DiscoveryModerationStatus.CORRECTION_REQUESTED,
      remove: DiscoveryModerationStatus.REMOVED,
    }[action];
    const updated = await prisma.communityDiscovery.updateMany({
      where: {
        id,
        moderationStatus: { not: DiscoveryModerationStatus.REMOVED },
      },
      data: {
        moderationStatus: status,
        moderatorId: user.id,
        moderatorNote: note ?? null,
        moderatedAt: new Date(),
        sourceCorroborated: action === "approve" && sourceCorroborated,
      },
    });
    return updated.count
      ? apiOk({ id, status })
      : apiError("Discovery not found", 404, "NOT_FOUND");
  } catch (error) {
    return serverError(error, "Unable to moderate discovery");
  }
}
