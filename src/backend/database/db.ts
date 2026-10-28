import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseUrl } from "../config/env";

// Opens the SQLite file, creates its parent directory and enables WAL and foreign keys.
export async function createDb(databaseUrl: string): Promise<PrismaClient> {
  const url = resolveDatabaseUrl(databaseUrl);
  await mkdir(dirname(url.slice(5)), { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url, timeout: 5000 });
  const db = new PrismaClient({ adapter });
  try {
    await db.$connect();

    // WAL lets readers keep working while another connection writes.
    await db.$queryRaw(Prisma.sql`PRAGMA journal_mode = WAL`);
    await db.$executeRaw(Prisma.sql`PRAGMA foreign_keys = ON`);
    return db;
  } catch (error) {
    await db.$disconnect().catch(() => undefined);
    throw error;
  }
}

const globalDb = globalThis as typeof globalThis & { taskboardDb?: Promise<PrismaClient> };

// One shared connection promise per process. A failed first connection can be tried again.
export function getDb(): Promise<PrismaClient> {
  globalDb.taskboardDb ??= createDb(process.env.DATABASE_URL ?? "file:./data/tictactoe.db").catch(
    (error) => {
      globalDb.taskboardDb = undefined;
      throw error;
    },
  );
  return globalDb.taskboardDb;
}
