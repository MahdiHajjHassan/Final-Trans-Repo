import { afterEach, expect, test, vi } from "vitest";
import { delimiter, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { runTestCommand, testSettings } from "../helpers/e2e-environment";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("isolated browser environment accepts a direct ignored env file on the current platform", () => {
  vi.stubEnv("TICTACTOE_E2E_ENV_FILE", ".env.e2e-harness-regression");
  const settings = testSettings();
  expect(settings.envFile).toBe(resolve(".env.e2e-harness-regression"));
  expect(settings.values).toEqual({});
});

test.each([".env", ".env.example", ".env.", ".env.e2e/nested", "../.env.e2e", "other/.env.e2e"])(
  "browser environment refuses unsafe credential destination %s",
  (path) => {
    vi.stubEnv("TICTACTOE_E2E_ENV_FILE", path);
    expect(() => testSettings()).toThrow(
      "Test credentials must use a separate ignored .env.* file",
    );
  },
);

test("isolated Compose configuration uses and declares the native path separator", () => {
  vi.stubEnv("TICTACTOE_E2E_ENV_FILE", ".env.e2e-harness-regression");
  vi.stubEnv("CODEX_PROXY_CERT", "");
  vi.stubEnv("COMPOSE_PATH_SEPARATOR", "wrong-inherited-separator");
  const settings = testSettings();
  expect(settings.env.COMPOSE_FILE).toBe(
    ["compose.yaml", "deploy/compose.e2e.yaml"].join(delimiter),
  );
  expect(settings.env.COMPOSE_PATH_SEPARATOR).toBe(delimiter);
});

test("isolated Compose includes the optional cloud overlay only with a proxy certificate", () => {
  vi.stubEnv("TICTACTOE_E2E_ENV_FILE", ".env.e2e-harness-regression");
  vi.stubEnv("CODEX_PROXY_CERT", "/synthetic/proxy.crt");
  expect(testSettings().env.COMPOSE_FILE).toBe(
    ["compose.yaml", "deploy/compose.cloud.yaml", "deploy/compose.e2e.yaml"].join(delimiter),
  );
});

test("browser setup command diagnostics redact configured credentials", () => {
  vi.stubEnv("TICTACTOE_E2E_ENV_FILE", ".env.e2e-harness-regression");
  vi.stubEnv("ADMIN_PASSWORD", "synthetic-harness-password");
  vi.stubEnv("private_test_secret", "synthetic-private-secret");
  const logFile = resolve(testSettings().logDir, "e2e-commands.log");
  const before = existsSync(logFile) ? readFileSync(logFile, "utf8").length : 0;
  runTestCommand(process.execPath, [
    "-e",
    "console.log(process.env.ADMIN_PASSWORD); console.error(process.env.private_test_secret);",
  ]);
  const log = readFileSync(logFile, "utf8").slice(before);
  expect(log).not.toContain("synthetic-harness-password");
  expect(log).not.toContain("synthetic-private-secret");
});
