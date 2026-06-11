import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

export function apiError(message: string, status: number, code: ApiErrorCode) {
  return NextResponse.json(
    { error: { code, message } },
    { headers: JSON_HEADERS, status }
  );
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { headers: JSON_HEADERS, status });
}

export function serverError(error: unknown, context: string) {
  console.error(context, error);
  return apiError("Internal server error", 500, "SERVER_ERROR");
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

export function boundedString(value: unknown, maxLength: number, fallback = "") {
  return safeString(value, fallback).slice(0, maxLength);
}

export async function readJsonObject(request: Request) {
  try {
    const body = await request.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}
