import { describe, expect, it } from "vitest";
import {
  AsyncRequestQueue,
  withExponentialBackoff,
} from "./async-request-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("bounded async request queue", () => {
  it("enforces concurrency and rejects work beyond the waiting bound", async () => {
    const queue = new AsyncRequestQueue(1, 1, "test");
    const first = deferred<string>();
    const firstRun = queue.run(() => first.promise);
    const secondRun = queue.run(async () => "second");
    await expect(queue.run(async () => "overflow")).rejects.toThrow(
      "test request queue is full",
    );
    expect(queue.depth).toEqual({ active: 1, pending: 1 });
    first.resolve("first");
    await expect(firstRun).resolves.toBe("first");
    await expect(secondRun).resolves.toBe("second");
    expect(queue.depth).toEqual({ active: 0, pending: 0 });
  });

  it("releases capacity when a queued operation fails", async () => {
    const queue = new AsyncRequestQueue(1, 1, "test");
    const first = deferred<void>();
    const firstRun = queue.run(async () => {
      await first.promise;
      throw new Error("operation failed");
    });
    const secondRun = queue.run(async () => "recovered");
    first.resolve();
    await expect(firstRun).rejects.toThrow("operation failed");
    await expect(secondRun).resolves.toBe("recovered");
    expect(queue.depth).toEqual({ active: 0, pending: 0 });
  });

  it("retries only retryable failures and returns the successful result", async () => {
    let calls = 0;
    const retryNumbers: number[] = [];
    await expect(
      withExponentialBackoff(
        async () => {
          calls += 1;
          if (calls < 3) throw new Error("temporary");
          return "ready";
        },
        {
          retries: 2,
          baseDelayMs: 0,
          jitterMs: 0,
          shouldRetry: () => true,
          onRetry: (retry) => retryNumbers.push(retry),
        },
      ),
    ).resolves.toBe("ready");
    expect(calls).toBe(3);
    expect(retryNumbers).toEqual([1, 2]);
  });

  it("does not retry a non-retryable failure", async () => {
    let calls = 0;
    await expect(
      withExponentialBackoff(
        async () => {
          calls += 1;
          throw new Error("invalid credentials");
        },
        { retries: 3, shouldRetry: () => false },
      ),
    ).rejects.toThrow("invalid credentials");
    expect(calls).toBe(1);
  });
});
