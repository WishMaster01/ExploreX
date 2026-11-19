import { Pool } from "pg";
import { getServerEnvironment } from "@/lib/env";
import "server-only";

const globalForProbe = globalThis as typeof globalThis & {
  readinessPool?: Pool;
};

function getPool() {
  if (globalForProbe.readinessPool) return globalForProbe.readinessPool;
  const connectionString = getServerEnvironment().DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  globalForProbe.readinessPool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 10_000,
    query_timeout: 1_800,
    statement_timeout: 1_500,
  });
  return globalForProbe.readinessPool;
}

/** PostgreSQL enforces statement_timeout; pg also bounds connect and query waits. */
export async function probeDatabase() {
  await getPool().query("SELECT 1");
}
