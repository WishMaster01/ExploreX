export interface AsyncCache<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

type CacheEntry<T> = { expiresAt: number; value: T };

export class LruTtlCache<T> implements AsyncCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries = 200,
    private readonly defaultTtlMs = 5 * 60_000,
  ) {}

  async get(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: T, ttlMs = this.defaultTtlMs): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { expiresAt: Date.now() + Math.max(1, ttlMs), value });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }
}

