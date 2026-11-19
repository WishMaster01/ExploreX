import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const suppliedRequestId = req.headers.get("x-request-id");
  const requestId =
    suppliedRequestId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      suppliedRequestId,
    )
      ? suppliedRequestId
      : crypto.randomUUID();
  req.headers.set("x-request-id", requestId);
  const incomingTrace = req.headers.get("traceparent");
  if (
    !incomingTrace ||
    !/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i.test(incomingTrace)
  ) {
    const traceId = crypto.randomUUID().replaceAll("-", "");
    const spanId = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    req.headers.set(
      "traceparent",
      `00-${traceId}-${spanId}-${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? "01" : "00"}`,
    );
  }
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  const response = NextResponse.next({ request: { headers: req.headers } });
  response.headers.set("x-request-id", requestId);
  response.headers.set("traceparent", req.headers.get("traceparent")!);
  if (req.nextUrl.pathname.startsWith("/api/"))
    response.headers.set("cache-control", "no-store");
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
