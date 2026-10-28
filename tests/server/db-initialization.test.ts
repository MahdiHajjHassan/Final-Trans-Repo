import { expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { createDb } from "@/backend/database/db";

test("failed post-connect initialization closes its real SQLite handle before retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tictactoe-init-failure-"));
  const handles: Array<{ open: boolean; close(): void }> = [];
  const connect = PrismaBetterSqlite3.prototype.connect;
  const capture = vi
    .spyOn(PrismaBetterSqlite3.prototype, "connect")
    .mockImplementation(async function (this: PrismaBetterSqlite3) {
      const adapter = await connect.call(this);
      handles.push((adapter as unknown as { client: (typeof handles)[number] }).client);
      return adapter;
    });
  const failure = new Error("controlled post-connect database failure");
  const query = vi.spyOn(PrismaClient.prototype, "$queryRaw").mockRejectedValueOnce(failure);
  let retry: PrismaClient | undefined;
  try {
    await expect(createDb(`file:${join(directory, "test.db")}`)).rejects.toBe(failure);
    expect(handles).toHaveLength(1);
    expect(handles[0].open, "failed initialization must not leak an open SQLite database").toBe(
      false,
    );
    query.mockRestore();
    retry = await createDb(`file:${join(directory, "test.db")}`);
    expect(await retry.$queryRawUnsafe("SELECT 1 AS ready")).toEqual([{ ready: 1n }]);
  } finally {
    query.mockRestore();
    capture.mockRestore();
    await retry?.$disconnect();
    for (const handle of handles) if (handle.open) handle.close();
    await rm(directory, { recursive: true, force: true });
  }
});
