import { NextResponse } from "next/server";
import "server-only";
import { serverLogger } from "./observability/server-logger";
import { APP_CONFIG } from "./config";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE";

export type AppErrorCode =
  | ApiErrorCode
  | "VALIDATION_ERROR"
  | "AI_PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "TRIP_NOT_FOUND";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

export function apiError(message: string, status: number, code: AppErrorCode) {
  return NextResponse.json(
    { error: { code, message } },
    { headers: JSON_HEADERS, status },
  );
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { headers: JSON_HEADERS, status });
}

export function serverError(error: unknown, context: string) {
  serverLogger.error("api.unhandled_error", {
    context,
    errorType: error instanceof Error ? error.name : "unknown",
    errorCode:
      isRecord(error) && typeof error.code === "string"
        ? error.code
        : undefined,
  });
  return apiError("Internal server error", 500, "SERVER_ERROR");
}

export function validationError(message = "Request validation failed") {
  return apiError(message, 400, "VALIDATION_ERROR");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function boundedString(
  value: unknown,
  maxLength: number,
  fallback = "",
) {
  return safeString(value, fallback).slice(0, maxLength);
}

export async function readJsonObject(request: Request) {
  try {
    const body = await readJson(request);
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > APP_CONFIG.api.maxJsonBodyBytes
  )
    return null;
  try {
    if (!request.body) return null;
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > APP_CONFIG.api.maxJsonBodyBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    return null;
  }
}
