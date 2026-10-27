import { expect, test } from "vitest";
import { resolve } from "node:path";
test("fresh-clone rehearsal isolates DB/app/dotenv/preload settings without losing network trust", async () => {
  const { rehearsalEnvironment } = await import("../../scripts/lib/rehearsal-env.mjs");
  const original = { DATABASE_URL: "file:/tmp/unrelated.db", APP_ORIGIN: "https://unrelated.example", ADMIN_EMAIL: "unrelated@example.test", ADMIN_PASSWORD: "unrelated-password", PUBLIC_API_KEY: "x", API_ACTOR_EMAIL: "api@unrelated.example", HTTPS_PORT: "443", DOTENV_CONFIG_PATH: "/tmp/unrelated.env", DOTENV_CONFIG_OVERRIDE: "true", NODE_OPTIONS: "--require dotenv/config", TICTACTOE_E2E_ENV_FILE: "/tmp/other.env", TICTACTOE_E2E_PROJECT: "other", TICTACTOE_E2E_PORT: "8443", HTTPS_PROXY: "http://proxy.example", NODE_EXTRA_CA_CERTS: "/tmp/trusted-ca.crt" };
  const env = rehearsalEnvironment(original, "/tmp/fresh-clone");
  expect(env.DATABASE_URL).toBe(`file:${resolve("/tmp/fresh-clone/data/tictactoe.db")}`);
  for (const key of ["APP_ORIGIN", "ADMIN_EMAIL", "ADMIN_PASSWORD", "PUBLIC_API_KEY", "API_ACTOR_EMAIL", "HTTPS_PORT", "DOTENV_CONFIG_PATH", "DOTENV_CONFIG_OVERRIDE", "NODE_OPTIONS", "TICTACTOE_E2E_ENV_FILE", "TICTACTOE_E2E_PROJECT", "TICTACTOE_E2E_PORT"]) expect(env[key]).toBeUndefined();
  expect(env.HTTPS_PROXY).toBe(original.HTTPS_PROXY); expect(env.NODE_EXTRA_CA_CERTS).toBe(original.NODE_EXTRA_CA_CERTS);
  expect(original.DATABASE_URL).toBe("file:/tmp/unrelated.db");
});
