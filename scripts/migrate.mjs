import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Sqlite from "better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./data/tictactoe.db";
if (!url.startsWith("file:") || !url.slice(5) || url.includes("\0") || url.includes("?"))
  throw new Error("DATABASE_URL must identify a local SQLite file");
const filename = resolve(url.slice(5));
await mkdir(dirname(filename), { recursive: true });
// Initialize the SQLite file before Prisma probes it; never reset existing data.
const bootstrap = new Sqlite(filename);
bootstrap.close();
const result = spawnSync(
  process.execPath,
  ["--", resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${filename}` },
  },
);
process.exitCode = result.status ?? 1;
