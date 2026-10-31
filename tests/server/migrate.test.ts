import { afterEach, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import Sqlite from "better-sqlite3";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

test("deployment migrates a fresh nested SQLite location and preserves data on rerun", async () => {
  const dir = await mkdtemp(join(tmpdir(), "taskboard-migrate-test-"));
  dirs.push(dir);
  const path = join(dir, "nested", "test.db");
  const run = () =>
    spawnSync(process.execPath, ["--", resolve("scripts/db/migrate.mjs")], {
      env: { ...process.env, DATABASE_URL: `file:${path}` },
      encoding: "utf8",
    });
  const first = run();
  expect(first.status, first.stdout + first.stderr).toBe(0);
  const db = new Sqlite(path);
  db.prepare('INSERT INTO "User" (id,email,displayName,passwordHash) VALUES (?,?,?,?)').run(
    "test-user",
    "preserved@example.test",
    "Preserved",
    "test-hash",
  );
  db.close();
  const second = run();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  const reopened = new Sqlite(path);
  try {
    expect(reopened.prepare('SELECT displayName FROM "User" WHERE id=?').get("test-user")).toEqual({
      displayName: "Preserved",
    });
  } finally {
    reopened.close();
  }
});
