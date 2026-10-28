import "dotenv/config";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

function resolveDatabaseUrl(value: string): string {
  if (
    !value.startsWith("file:") ||
    !value.slice(5) ||
    value.includes("\0") ||
    value.includes("?")
  ) {
    throw new Error("DATABASE_URL must identify a local SQLite file");
  }
  return `file:${resolve(value.slice(5))}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: resolveDatabaseUrl(process.env.DATABASE_URL ?? "file:./data/tictactoe.db") },
});
