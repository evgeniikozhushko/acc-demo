import "server-only";

// Prisma 6: client is generated to src/generated/prisma
import { PrismaClient } from "@/generated/prisma";

// Standard Next.js singleton pattern.
// In development, Next.js hot-reloads invalidate module cache, which would
// exhaust the PostgreSQL connection pool without this globalThis guard.
// In production, modules are cached naturally — globalThis is never used.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
