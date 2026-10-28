import { expect, test } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("database initialization recovers after a temporary filesystem failure is repaired", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tictactoe-recovery-"));
  const blocked = join(directory, "blocked");
  const originalUrl = process.env.DATABASE_URL;
  const { getDb } = await import("@/backend/database/db");
  let connected: Awaited<ReturnType<typeof getDb>> | undefined;
  try {
    await writeFile(blocked, "temporary obstruction");
    process.env.DATABASE_URL = `file:${join(blocked, "test.db")}`;
    await expect(getDb()).rejects.toThrow();
    await rm(blocked);
    await mkdir(blocked);
    connected = await getDb();
    expect(await connected.$queryRawUnsafe("SELECT 1 AS ready")).toEqual([{ ready: 1n }]);
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await connected?.$disconnect();
    delete (globalThis as typeof globalThis & { taskboardDb?: unknown }).taskboardDb;
    await rm(directory, { recursive: true, force: true });
  }
});
