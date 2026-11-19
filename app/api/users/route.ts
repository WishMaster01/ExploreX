import { withRequestMetrics } from "@/lib/observability/request-metrics";
import { apiError, apiOk, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";
import { enforceRateLimit } from "@/lib/rate-limit";
import { userDtoSchema } from "@/lib/domain/schemas";
import "server-only";

function toUserDto(
  user: NonNullable<Awaited<ReturnType<typeof getOrCreateCurrentUser>>>,
) {
  if (!user) throw new Error("Cannot serialize a missing user");
  return userDtoSchema.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    subscription: user.subscription,
  });
}

async function __route_POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const denied = await enforceRateLimit(request, {
      capacity: 20,
      interval: 3600,
      refillRate: 10,
      userId: user.id,
    });
    if (denied) return denied;

    return apiOk(toUserDto(user));
  } catch (error) {
    return serverError(error, "Error creating or updating user");
  }
}

async function __route_GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    const denied = await enforceRateLimit(request, {
      capacity: 120,
      interval: 3600,
      refillRate: 60,
      userId: user.id,
    });
    if (denied) return denied;

    return apiOk(toUserDto(user));
  } catch (error) {
    return serverError(error, "Error fetching user");
  }
}

export function GET(...args: Parameters<typeof __route_GET>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/users", { method: "GET" });
  return withRequestMetrics(request, "GET /api/users", () =>
    __route_GET(...args),
  );
}

export function POST(...args: Parameters<typeof __route_POST>) {
  const firstArgument = (args as unknown[])[0];
  const request =
    firstArgument instanceof Request
      ? firstArgument
      : new Request("http://localhost/api/users", { method: "POST" });
  return withRequestMetrics(request, "POST /api/users", () =>
    __route_POST(...args),
  );
}
