import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDb } from "./db";

export async function readiness(db?: PrismaClient): Promise<{ status: "ok"; database: "ok" }> {
  const database = db ?? (await getDb());
  const tables = await database.$queryRaw<Array<{ name: string }>>(Prisma.sql`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name IN ('User', 'Session', 'Game', 'GameMove', 'RateLimitBucket')
  `);
  if (tables.length !== 5) throw new Error("Database migrations are not applied");
  return { status: "ok", database: "ok" };
}
