import { prisma } from "@/lib/db";
import type { AiGenerationMetrics } from "@/lib/ai/generate";
import { serverLogger } from "./server-logger";
import "server-only";

function safeMetrics(
  metrics: AiGenerationMetrics,
  promptVersion: string,
  cacheHit: boolean,
) {
  return {
    provider: metrics.provider,
    model: metrics.model,
    feature: metrics.feature,
    promptVersion,
    requestId: metrics.requestId,
    latencyMs: metrics.latencyMs,
    promptTokens: metrics.promptTokens,
    completionTokens: metrics.completionTokens,
    estimatedCostUsd: metrics.estimatedCostUsd,
    retryCount: metrics.retryCount,
    cacheHit,
  };
}

export function recordAiGeneration(
  clerkUserId: string,
  metrics: AiGenerationMetrics,
  promptVersion: string,
  cacheHit = false,
) {
  void prisma.user
    .findUnique({ where: { clerkUserId }, select: { id: true } })
    .then((user) =>
      prisma.analyticsEvent.create({
        data: {
          type: "ai_generation",
          success: metrics.success,
          userId: user?.id,
          metadata: safeMetrics(metrics, promptVersion, cacheHit),
        },
      }),
    )
    .catch(() =>
      serverLogger.warn("analytics.write_failed", {
        event: "ai_generation",
        success: metrics.success,
      }),
    );
}

export function recordAiFeatureGeneration(
  userId: string,
  metrics: AiGenerationMetrics,
  promptVersion: string,
) {
  void prisma.analyticsEvent
    .create({
      data: {
        type: "ai_feature",
        success: metrics.success,
        userId,
        metadata: safeMetrics(metrics, promptVersion, false),
      },
    })
    .catch(() =>
      serverLogger.warn("analytics.write_failed", {
        event: "ai_feature",
        success: metrics.success,
      }),
    );
}
