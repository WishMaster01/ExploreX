import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import {
  DiscoveryModerationStatus,
  DiscoverySignalType,
} from "@/lib/generated/prisma/client";
import { z } from "zod";
import "server-only";

const schema = z
  .object({
    action: z.enum([
      "save",
      "unsave",
      "recommend",
      "report",
      "correction",
      "visit",
    ]),
    reason: z.string().trim().min(5).max(500).optional(),
  })
  .strict();
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user)
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    const denied = await enforceRateLimit(request, {
      ...APP_CONFIG.rateLimits.tripWrite,
      userId: user.id,
    });
    if (denied) return denied;
    const { id } = await context.params;
    const parsed = schema.safeParse(await readJsonObject(request));
    if (
      !parsed.success ||
      (["report", "correction"].includes(parsed.data.action) &&
        !parsed.data.reason)
    )
      return apiError(
        "A valid action and reason are required",
        400,
        "VALIDATION_ERROR",
      );
    const discovery = await prisma.communityDiscovery.findFirst({
      where: { id, moderationStatus: DiscoveryModerationStatus.APPROVED },
      select: { id: true },
    });
    if (!discovery) return apiError("Discovery not found", 404, "NOT_FOUND");
    const { action, reason } = parsed.data;
    if (action === "save" || action === "unsave") {
      if (action === "save")
        await prisma.savedDiscovery.upsert({
          where: { userId_discoveryId: { userId: user.id, discoveryId: id } },
          update: {},
          create: { userId: user.id, discoveryId: id },
        });
      else
        await prisma.savedDiscovery.deleteMany({
          where: { userId: user.id, discoveryId: id },
        });
    } else {
      const type =
        action === "recommend"
          ? DiscoverySignalType.RECOMMENDATION
          : action === "report"
            ? DiscoverySignalType.REPORT
            : action === "correction"
              ? DiscoverySignalType.CORRECTION_REQUEST
              : DiscoverySignalType.VISIT_REPORTED;
      await prisma.discoverySignal.upsert({
        where: {
          discoveryId_userId_type: { discoveryId: id, userId: user.id, type },
        },
        update: { reason },
        create: { discoveryId: id, userId: user.id, type, reason },
      });
    }
    return apiOk({ id, action, recorded: true });
  } catch (error) {
    return serverError(error, "Unable to record discovery action");
  }
}
