import arcjet, { tokenBucket } from "@arcjet/next";
import { apiError } from "@/lib/api";

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

    console.warn("ARCJET_KEY is not configured; skipping rate limit in development");
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
