import arcjet, { tokenBucket } from "@arcjet/next";
import { apiError } from "@/lib/api";
import { SlidingWindowRateLimiter } from "@/lib/algorithms/rate-limit/sliding-window";

const localLimiter = new SlidingWindowRateLimiter();

type RateLimitOptions = {
  capacity: number;
  interval: number;
  requested?: number;
  refillRate: number;
  userId: string;
};

export async function enforceRateLimit(
  request: Request,
  {
    capacity,
    interval,
    requested = 1,
    refillRate,
    userId,
  }: RateLimitOptions
) {
  if (!process.env.ARCJET_KEY) {
    if (process.env.NODE_ENV === "production") {
      return apiError(
        "Rate limiting is not configured",
        503,
        "SERVICE_UNAVAILABLE"
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const key = `${userId}:${forwardedFor || "local"}`;
    const result = localLimiter.check(key, capacity, interval * 1000, requested);
    if (!result.allowed) {
      return apiError("Too many requests", 429, "RATE_LIMITED");
    }
    return null;
  }

  const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
      tokenBucket({
        capacity,
        characteristics: ["userId"],
        interval,
        mode: "LIVE",
        refillRate,
      }),
    ],
  });

  const rateLimitRequest = new Request(request.url, {
    headers: request.headers,
    method: request.method,
  });
  const decision = await aj.protect(rateLimitRequest, { requested, userId });

  if (decision.isDenied()) {
    return apiError("Too many requests", 429, "RATE_LIMITED");
  }

  return null;
}
