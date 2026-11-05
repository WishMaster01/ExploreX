import "server-only";
import type { z } from "zod";
import { DomainError } from "@/lib/domain/errors";
import { fetchWithTimeout } from "@/lib/travel-data/fetch-with-timeout";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 100;

function responseError(status: number): DomainError {
  if (status === 401 || status === 403)
    return new DomainError(
      "CONFIGURATION_ERROR",
      "Travel provider rejected its credentials or permissions",
    );
  if (status === 429)
    return new DomainError("RATE_LIMITED", "Travel provider quota was reached", {
      retryable: true,
    });
  return new DomainError(
    "PROVIDER_UNAVAILABLE",
    "Travel provider request failed",
    { retryable: status >= 500 },
  );
}

/** Makes at most two requests; retries only transient network and provider failures. */
export async function requestProviderJson(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetcher, input, init, timeoutMs);
      if (!response.ok) {
        const error = responseError(response.status);
        if (error.retryable && attempt + 1 < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        throw error;
      }

      try {
        return await response.json();
      } catch {
        throw new DomainError(
          "PROVIDER_UNAVAILABLE",
          "Travel provider returned malformed JSON",
        );
      }
    } catch (error) {
      if (error instanceof DomainError) {
        if (error.retryable && attempt + 1 < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        throw error;
      }
      const timedOut = error instanceof Error && error.name === "AbortError";
      if (attempt + 1 < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      throw new DomainError(
        timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
        timedOut ? "Travel provider request timed out" : "Travel provider is unavailable",
        { retryable: true },
      );
    }
  }
  throw new DomainError("PROVIDER_UNAVAILABLE", "Travel provider is unavailable");
}

export function parseProviderResponse<T>(
  schema: z.ZodType<T>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "Travel provider returned an invalid response",
    );
  return result.data;
}

export function providerTimestamp(): string {
  return new Date().toISOString();
}
