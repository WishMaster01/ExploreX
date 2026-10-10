import { prisma } from "@/lib/db";
import { serverLogger } from "./server-logger";
import "server-only";

export function recordAiGeneration(
  clerkUserId: string,
  success: boolean,
  destination?: string | null,
) {
  void prisma.user
    .findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    .then((user) =>
      prisma.analyticsEvent.create({
        data: {
          type: "ai_generation",
          success,
          destination: destination ?? null,
          userId: user?.id,
        },
      }),
    )
    .catch(() =>
      serverLogger.warn("analytics.write_failed", {
        event: "ai_generation",
        success,
      }),
    );
}
