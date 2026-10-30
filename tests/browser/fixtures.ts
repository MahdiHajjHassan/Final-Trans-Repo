import { test as base, expect, type Page, type APIRequestContext } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resetTestDb, testSettings } from "../helpers/e2e-environment";
import { dictionaries } from "../../src/shared/i18n/dictionaries";
export const t = dictionaries.en;
type ExpectedFailure = { path: string; status: number };
export const test = base.extend<{ isolated: void; expectedFailures: ExpectedFailure[] }>({
  browser: [
    async ({ browser }, provide) => {
      const warmup = await browser.newContext({ ignoreHTTPSErrors: false });
      try {
        const page = await warmup.newPage();
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await page.goto(`${testSettings().values.APP_ORIGIN}/api/health`, {
              waitUntil: "networkidle",
            });
            if (response?.status() !== 200) throw new Error("Browser HTTPS warmup failed");
            break;
          } catch (error) {
            // Docker bridge creation can notify Chrome after Compose is healthy.
            // Retry only this initial idempotent health GET, never test actions.
            const transient =
              String(error).includes("ERR_NETWORK_CHANGED") ||
              String(error).includes(
                'interrupted by another navigation to "chrome-error://chromewebdata/"',
              );
            if (attempt !== 0 || !transient) throw error;
          }
        }
      } finally {
        await warmup.close();
      }
      await provide(browser);
    },
    { scope: "worker" },
  ],
  isolated: [
    async ({}, provide) => {
      await resetTestDb();
      await provide();
    },
    { auto: true },
  ],
  expectedFailures: async ({}, provide) => {
    await provide([]);
  },
  page: async ({ page, expectedFailures, browser }, provide, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (!["error", "warning"].includes(message.type())) return;
      const text = message.text();
      const path = message.location().url;
      if (
        expectedFailures.some(
          (entry) =>
            path.includes(entry.path) &&
            (text.includes(`status of ${entry.status}`) ||
              (entry.status === 0 && text === "Failed to load resource: net::ERR_FAILED")),
        )
      )
        return;
      errors.push(`${message.type()}: ${text} (${path})`);
    });
    const matrixPath = resolve(testSettings().logDir, "browser-versions.json");
    let versions: Record<string, unknown> = {};
    try {
      versions = JSON.parse(readFileSync(matrixPath, "utf8"));
    } catch {}
    versions[info.project.name] = {
      version: browser.version(),
      viewport: "1280x900,360x900",
      tls: "Local CA trusted; browser and Node certificate/hostname validation enabled",
    };
    writeFileSync(matrixPath, JSON.stringify(versions, null, 2));
    await provide(page);
    expect(errors, "Unexpected browser console warnings/errors or page failures").toEqual([]);
  },
});
export { expect };
export function credentials(who: "admin" | "a" | "b" | "c" | "d" = "a") {
  const { values } = testSettings();
  return {
    email: who === "admin" ? values.ADMIN_EMAIL : `member-${who}@example.test`,
    password: values.ADMIN_PASSWORD,
  };
}
export async function loginApi(
  request: APIRequestContext,
  who: "admin" | "a" | "b" | "c" | "d" = "a",
) {
  const { values } = testSettings();
  const response = await request.post("/api/auth/login", {
    data: credentials(who),
    headers: { Origin: values.APP_ORIGIN },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data as { id: string };
}
export async function loginUi(page: Page, who: "admin" | "a" | "b" | "c" | "d" = "a") {
  await page.goto("/en/login");
  const input = credentials(who);
  await page.getByLabel(t.email, { exact: true }).fill(input.email);
  await page.getByLabel(t.password, { exact: true }).fill(input.password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/play$/);
}
