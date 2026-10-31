import { afterEach, expect, test } from "vitest";
import { mkdtemp, readFile, writeFile, stat, symlink, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Sqlite from "better-sqlite3";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function fixture() {
  const { rm } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "game-backup-test-"));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("online backup includes committed WAL rows without closing the active writer", async () => {
  const { backupDatabase, restoreDatabase } = await import("../../scripts/lib/database-backup.mjs");
  const root = await fixture(),
    source = join(root, "live.db"),
    target = join(root, "private", "backup.db");
  const live = new Sqlite(source);
  try {
    live.pragma("journal_mode = WAL");
    live.pragma("wal_autocheckpoint = 0");
    live.exec("CREATE TABLE records(value TEXT); INSERT INTO records VALUES ('committed-in-wal')");
    expect((await stat(`${source}-wal`)).size).toBeGreaterThan(0);
    await backupDatabase(source, target);
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    expect((await stat(join(root, "private"))).mode & 0o777).toBe(0o700);
    const backup = new Sqlite(target, { readonly: true });
    try {
      expect(backup.prepare("SELECT value FROM records").get()).toEqual({
        value: "committed-in-wal",
      });
    } finally {
      backup.close();
    }
    live.exec("INSERT INTO records VALUES ('after-backup')");
    const restored = join(root, "restored.db");
    await restoreDatabase(target, restored);
    const db = new Sqlite(restored, { readonly: true });
    try {
      expect(db.prepare("SELECT COUNT(*) AS n FROM records").get()).toEqual({ n: 1 });
    } finally {
      db.close();
    }
  } finally {
    live.close();
  }
});

test("backup and restore refuse overwrite and leave existing data untouched", async () => {
  const { backupDatabase, restoreDatabase } = await import("../../scripts/lib/database-backup.mjs");
  const root = await fixture(),
    source = join(root, "source.db"),
    target = join(root, "existing.db");
  const db = new Sqlite(source);
  db.exec("CREATE TABLE records(value TEXT)");
  db.close();
  await writeFile(target, "preserved");
  for (const operation of [backupDatabase, restoreDatabase]) {
    await expect(operation(source, target)).rejects.toThrow(/exist/i);
    expect(await readFile(target, "utf8")).toBe("preserved");
  }
});

test("invalid or missing backups never create a restore database", async () => {
  const { restoreDatabase } = await import("../../scripts/lib/database-backup.mjs");
  const root = await fixture(),
    source = join(root, "invalid.db"),
    target = join(root, "restored.db");
  await writeFile(source, "not a database");
  await expect(restoreDatabase(source, target)).rejects.toThrow();
  await expect(restoreDatabase(join(root, "missing.db"), target)).rejects.toThrow();
  expect(await readdir(root)).toEqual(["invalid.db"]);
});

test("backup refuses source and destination symlinks and preexisting destination WAL files", async () => {
  const { backupDatabase } = await import("../../scripts/lib/database-backup.mjs");
  const root = await fixture(),
    source = join(root, "source.db");
  const db = new Sqlite(source);
  db.exec("CREATE TABLE records(value TEXT)");
  db.close();
  await symlink(source, join(root, "linked.db"));
  await expect(backupDatabase(join(root, "linked.db"), join(root, "new.db"))).rejects.toThrow(
    /symlink/i,
  );
  await mkdir(join(root, "outside"));
  await symlink(join(root, "outside"), join(root, "linked-dir"));
  await expect(backupDatabase(source, join(root, "linked-dir", "new.db"))).rejects.toThrow(
    /symlink/i,
  );
  await writeFile(join(root, "new.db-wal"), "existing sidecar");
  await expect(backupDatabase(source, join(root, "new.db"))).rejects.toThrow(/exist/i);
  expect(await readFile(join(root, "new.db-wal"), "utf8")).toBe("existing sidecar");
});

test("database backup CLI works at its reorganized path and keeps no-overwrite behavior", async () => {
  const { spawnSync } = await import("node:child_process");
  const root = await fixture();
  const source = join(root, "source.db"),
    target = join(root, "new-backup.db");
  const db = new Sqlite(source);
  db.exec("CREATE TABLE records(value TEXT); INSERT INTO records VALUES ('preserved')");
  db.close();
  const command = join(process.cwd(), "scripts/db/database-backup.mjs");
  const first = spawnSync(process.execPath, [command, "backup", source, target], {
    cwd: root,
    encoding: "utf8",
  });
  expect(first.status, first.stderr).toBe(0);
  const bytes = await readFile(target);
  const second = spawnSync(process.execPath, [command, "backup", source, target], {
    cwd: root,
    encoding: "utf8",
  });
  expect(second.status).toBe(1);
  expect(second.stderr).toMatch(/already exists/i);
  expect(await readFile(target)).toEqual(bytes);
  const usage = spawnSync(process.execPath, [command], { cwd: root, encoding: "utf8" });
  expect(usage.status).toBe(1);
  expect(usage.stderr).toContain("scripts/db/database-backup.mjs");
});
