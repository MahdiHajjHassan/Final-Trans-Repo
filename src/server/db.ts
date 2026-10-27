import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseUrl } from "./config";

export async function createDb(databaseUrl: string): Promise<PrismaClient> {
  const url = resolveDatabaseUrl(databaseUrl);
  await mkdir(dirname(url.slice(5)), { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url, timeout: 5000 });
  const db = new PrismaClient({ adapter });
  await db.$connect();
  await db.$queryRaw(Prisma.sql`PRAGMA journal_mode = WAL`);
  await db.$executeRaw(Prisma.sql`PRAGMA foreign_keys = ON`);
  return db;
}

const globalDb = globalThis as typeof globalThis & { taskboardDb?: Promise<PrismaClient> };
export function getDb(): Promise<PrismaClient> {
  globalDb.taskboardDb ??= createDb(process.env.DATABASE_URL ?? "file:./data/tictactoe.db");
  return globalDb.taskboardDb;
}
