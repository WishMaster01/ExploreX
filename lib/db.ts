// lib/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import "server-only";
import { getServerEnvironment } from "@/lib/env";
import { serverLogger } from "@/lib/observability/server-logger";

const connectionString = getServerEnvironment().DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured to connect to PostgreSQL.");
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaQueryMetricsAttached?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] });

if (!globalForPrisma.prismaQueryMetricsAttached) {
  const onQuery = prisma.$on as unknown as (
    event: "query",
    listener: (event: { duration: number }) => void,
  ) => void;
  onQuery.call(prisma, "query", (event) => {
    serverLogger.info("database.query", { durationMs: event.duration });
  });
  globalForPrisma.prismaQueryMetricsAttached = true;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
