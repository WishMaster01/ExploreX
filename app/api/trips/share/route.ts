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

export async function DELETE(request: Request) {
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
