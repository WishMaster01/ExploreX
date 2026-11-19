import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { createHash, randomBytes } from "node:crypto";
import { apiError, apiOk, readJsonObject, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { z } from "zod";
import "server-only";

const schema = z.object({ tripId: z.string().min(1) }).strict();
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function __route_POST(request: Request) {
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
      return apiError("A valid trip ID is required", 400, "VALIDATION_ERROR");
    const token = randomBytes(32).toString("base64url");
    const updated = await prisma.trip.updateMany({
      where: { id: parsed.data.tripId, userId: user.id },
      data: { shareTokenHash: hashToken(token) },
    });
    if (!updated.count) return apiError("Trip not found", 404, "NOT_FOUND");
    return apiOk({ sharePath: `/shared-trips/${token}` });
  } catch (error) {
    return serverError(error, "Unable to create trip share link");
  }
}

async function __route_DELETE(request: Request) {
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
      return apiError("A valid trip ID is required", 400, "VALIDATION_ERROR");
    const updated = await prisma.trip.updateMany({
      where: { id: parsed.data.tripId, userId: user.id },
      data: { shareTokenHash: null },
    });
    if (!updated.count) return apiError("Trip not found", 404, "NOT_FOUND");
    return apiOk({ revoked: true });
  } catch (error) {
    return serverError(error, "Unable to revoke trip share link");
  }
}

export function DELETE(...args: Parameters<typeof __route_DELETE>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/trips/share", { method: "DELETE" });
  return withRequestMetrics(request, "DELETE /api/trips/share", () =>
    __route_DELETE(...args),
  );
}

export function POST(...args: Parameters<typeof __route_POST>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/trips/share", { method: "POST" });
  return withRequestMetrics(request, "POST /api/trips/share", () =>
    __route_POST(...args),
  );
}
