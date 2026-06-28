import { apiError, apiOk, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser(request);

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const denied = await enforceRateLimit(request, {
      capacity: 20, interval: 3600, refillRate: 10, userId: user.id,
    });
    if (denied) return denied;

    return apiOk(user);
  } catch (error) {
    return serverError(error, "Error creating or updating user");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const denied = await enforceRateLimit(request, {
      capacity: 120, interval: 3600, refillRate: 60, userId: user.id,
    });
    if (denied) return denied;

    return apiOk(user);
  } catch (error) {
    return serverError(error, "Error fetching user");
  }
}
