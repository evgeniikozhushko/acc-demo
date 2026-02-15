import "server-only";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// Prisma 7: client is generated to src/generated/prisma
// Use the explicit client.ts entry (Prisma 7 has no index.ts barrel)
import { PrismaClient } from "@/generated/prisma/client";

// Standard Next.js singleton pattern.
// In development, Next.js hot-reloads invalidate module cache, which would
// exhaust the PostgreSQL connection pool without this globalThis guard.
// In production, modules are cached naturally — globalThis is never used.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
