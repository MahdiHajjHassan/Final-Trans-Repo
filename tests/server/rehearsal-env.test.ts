import { expect, test } from "vitest";
import { resolve } from "node:path";
test("fresh-clone rehearsal isolates DB/app/dotenv/preload settings without losing network trust", async () => {
  const { rehearsalEnvironment } = await import("../../scripts/lib/rehearsal-env.mjs");
  const original = { DATABASE_URL: "file:/tmp/unrelated.db", APP_ORIGIN: "https://unrelated.example", ADMIN_EMAIL: "unrelated@example.test", ADMIN_PASSWORD: "unrelated-password", HTTPS_PORT: "443", DOTENV_CONFIG_PATH: "/tmp/unrelated.env", DOTENV_CONFIG_OVERRIDE: "true", NODE_OPTIONS: "--require dotenv/config", TICTACTOE_E2E_ENV_FILE: "/tmp/other.env", TICTACTOE_E2E_PROJECT: "other", TICTACTOE_E2E_PORT: "8443", HTTPS_PROXY: "http://proxy.example", NODE_EXTRA_CA_CERTS: "/tmp/trusted-ca.crt" };
  const env = rehearsalEnvironment(original, "/tmp/fresh-clone");
  expect(env.DATABASE_URL).toBe(`file:${resolve("/tmp/fresh-clone/data/tictactoe.db")}`);
  for (const key of ["APP_ORIGIN", "ADMIN_EMAIL", "ADMIN_PASSWORD", "HTTPS_PORT", "DOTENV_CONFIG_PATH", "DOTENV_CONFIG_OVERRIDE", "NODE_OPTIONS", "TICTACTOE_E2E_ENV_FILE", "TICTACTOE_E2E_PROJECT", "TICTACTOE_E2E_PORT"]) expect(env[key]).toBeUndefined();
  expect(env.HTTPS_PROXY).toBe(original.HTTPS_PROXY); expect(env.NODE_EXTRA_CA_CERTS).toBe(original.NODE_EXTRA_CA_CERTS);
  expect(original.DATABASE_URL).toBe("file:/tmp/unrelated.db");
});

test("fresh-clone rehearsal strips inherited configuration regardless of Windows key casing", async () => {
  const { rehearsalEnvironment } = await import("../../scripts/lib/rehearsal-env.mjs");
  const env = rehearsalEnvironment({
    App_Origin: "https://unrelated.example", Admin_Password: "synthetic-inherited-password",
    Dotenv_Config_Path: "unrelated.env", Node_Options: "--require unrelated-preload",
    Database_Url: "file:unrelated.db", Tictactoe_E2e_Project: "unrelated",
    Node_Extra_Ca_Certs: "trusted-ca.crt",
  }, "fresh-clone");
  expect(Object.keys(env).map((key) => key.toUpperCase()).sort()).toEqual(["DATABASE_URL", "NODE_EXTRA_CA_CERTS"]);
  expect(env.DATABASE_URL).toBe(`file:${resolve("fresh-clone/data/tictactoe.db")}`);
  expect(env.Node_Extra_Ca_Certs).toBe("trusted-ca.crt");
});
