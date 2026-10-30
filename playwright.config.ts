import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Brave uses Playwright's Chromium driver, but launches the installed Brave product.
const braveCandidates =
  process.platform === "win32"
    ? [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"]]
        .filter((directory): directory is string => Boolean(directory))
        .map((directory) =>
          join(directory, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        )
    : process.platform === "darwin"
      ? ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"]
      : [
          "/usr/bin/brave-browser",
          "/usr/bin/brave-browser-stable",
          "/usr/bin/brave",
          "/snap/bin/brave",
        ];
const braveExecutable =
  process.env.TICTACTOE_BRAVE_EXECUTABLE ||
  braveCandidates.find((candidate) => existsSync(candidate)) ||
  braveCandidates[0] ||
  "brave-browser";

const port = Number(process.env.TICTACTOE_E2E_PORT ?? 8443);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Use an isolated high test port");
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  globalSetup: "./tests/helpers/e2e-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `https://localhost:${port}`,
    ignoreHTTPSErrors: false,
    // Global setup verifies and trusts the local public CA.
    // Browser chain and hostname validation stays enabled.
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        browserName: "chromium",
        channel: "chrome",
        launchOptions: process.env.TICTACTOE_CHROME_EXECUTABLE
          ? { executablePath: process.env.TICTACTOE_CHROME_EXECUTABLE }
          : {},
      },
    },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        launchOptions: { firefoxUserPrefs: { "security.enterprise_roots.enabled": true } },
      },
    },
    {
      name: "brave",
      use: {
        browserName: "chromium",
        launchOptions: { executablePath: braveExecutable },
      },
    },
  ],
});
