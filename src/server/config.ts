import { resolve } from "node:path";
import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email());
const origin = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
}, "APP_ORIGIN must be an HTTPS origin without credentials, query, or path").transform((value) => new URL(value).origin);

const configSchema = z.object({
  DATABASE_URL: z.string().default("file:./data/tictactoe.db"),
  APP_ORIGIN: origin,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: z.string().min(12).max(128),
});

export function resolveDatabaseUrl(value: string): string {
  if (!value.startsWith("file:") || !value.slice(5) || value.includes("\0") || value.includes("?")) {
    throw new Error("DATABASE_URL must identify a local SQLite file");
  }
  return `file:${resolve(value.slice(5))}`;
}

export function loadConfig(environment: Record<string, string | undefined>) {
  const input = configSchema.parse(environment);
  return {
    databaseUrl: resolveDatabaseUrl(input.DATABASE_URL), appOrigin: input.APP_ORIGIN,
    adminEmail: input.ADMIN_EMAIL, adminPassword: input.ADMIN_PASSWORD,
  };
}

export type ServerConfig = ReturnType<typeof loadConfig>;
