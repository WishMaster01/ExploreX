export class SlidingWindowRateLimiter {
  private readonly requests = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number, cost = 1): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const cutoff = now - windowMs;
    const active = (this.requests.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (active.length + cost > limit) {
      this.requests.set(key, active);
      return { allowed: false, retryAfterMs: Math.max(1, (active[0] ?? now) + windowMs - now) };
    }
    for (let count = 0; count < cost; count += 1) active.push(now);
    this.requests.set(key, active);
    if (this.requests.size > 10_000) {
      for (const [candidate, timestamps] of this.requests) {
        if (!timestamps.some((timestamp) => timestamp > cutoff)) this.requests.delete(candidate);
      }
    }
    return { allowed: true, retryAfterMs: 0 };
  }
}

