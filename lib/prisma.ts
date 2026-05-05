import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDirect?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Cron-only client that bypasses PgBouncer (uses DIRECT_URL). Page requests
 * must keep using the pooled `prisma` to avoid eating Supabase's small direct
 * connection budget; this is exclusively for the daily cron lambda where
 * connection_limit=1 + transaction mode makes per-query acquire latency pile
 * up to 60s+. Falls back to DATABASE_URL if DIRECT_URL is unset.
 */
export const prismaDirect =
  globalForPrisma.prismaDirect ??
  new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
    log: ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaDirect = prismaDirect;
}
