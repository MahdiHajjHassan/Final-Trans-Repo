import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Sqlite from "better-sqlite3";

export async function createTestDb(options: { migrate?: boolean } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "taskboard-test-"));
  const filename = join(dir, "test.db");
  if (options.migrate !== false) {
    const raw = new Sqlite(filename);
    raw.pragma("foreign_keys = ON");
    try {
      const migrations = await readdir(resolve("prisma/migrations"), { withFileTypes: true });
      for (const migration of migrations
        .filter((item) => item.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        raw.exec(
          await readFile(resolve("prisma/migrations", migration.name, "migration.sql"), "utf8"),
        );
      }
    } finally {
      raw.close();
    }
  }
  const { createDb } = await import("@/server/db");
  const db = await createDb(`file:${filename}`);
  return {
    db,
    url: `file:${filename}`,
    async close() {
      await db.$disconnect();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
