export async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
