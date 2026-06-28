export class AsyncRequestQueue {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly concurrency = 3, private readonly maxWaiting = 100) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      if (this.waiting.length >= this.maxWaiting) throw new Error("AI request queue is full");
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; shouldRetry?: (error: unknown) => boolean } = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || options.shouldRetry?.(error) === false) throw error;
      const delay = (options.baseDelayMs ?? 350) * 2 ** attempt + Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
