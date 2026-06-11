import { auth } from "@clerk/nextjs/server";
import { apiError, apiOk, serverError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const rateLimitResponse = await enforceRateLimit(req, {
      capacity: 10,
      interval: 86400,
      refillRate: 5,
      requested: 5,
      userId,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return apiOk({ allowed: true });
  } catch (error) {
    return serverError(error, "Error checking Arcjet rate limit");
  }
}
