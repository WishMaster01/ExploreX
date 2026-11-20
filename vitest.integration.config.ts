import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root),
      "server-only": path.resolve(root, "lib/test/server-only.ts"),
    },
  },
  test: {
    include: ["integration/**/*.integration.test.ts"],
    setupFiles: ["integration/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
