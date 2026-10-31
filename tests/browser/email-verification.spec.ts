import { test, expect, settleBrowserNetwork, t, credentials, loginApi } from "./fixtures";
import { inboxCode, verifyEmailUi } from "../helpers/mailbox";
import { composeArgs, runTestCommand, testSettings } from "../helpers/e2e-environment";
import { dictionaries } from "../../src/shared/i18n/dictionaries";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

test("signup requires a delivered code before account login and game access", async ({ page }) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("Verified player");
  await page.getByLabel(t.email, { exact: true }).fill("verified-player@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  expect((await page.request.get("/api/account")).status()).toBe(401);
  const code = await inboxCode("verified-player@example.test");
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/login\?notice=verified$/);
  await page.getByLabel(t.email, { exact: true }).fill("verified-player@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/play$/);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/games\//);
  const reused = await page.request.post("/api/auth/verification/confirm", {
    headers: { Origin: testSettings().values.APP_ORIGIN },
    data: { code },
  });
  expect(reused.status()).toBe(400);
});

test("existing accounts must prove email ownership and old sessions stay revoked", async ({
  page,
}) => {
  await loginApi(page.request);
  runTestCommand(
    "docker",
    composeArgs([
      "exec",
      "-T",
      "app",
      "npm",
      "run",
      "account:email",
      "--",
      "--current-email",
      credentials().email,
      "--new-email",
      "legacy@example.test",
    ]),
  );
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await page.goto("/en/login");
  await page.getByLabel(t.email, { exact: true }).fill("legacy@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await verifyEmailUi(page, "legacy@example.test");
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await page.getByLabel(t.email, { exact: true }).fill("legacy@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/play$/);
});

test("wrong codes show a linked error and the latest delivered code still works", async ({
  page,
  expectedFailures,
}) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("Code correction");
  await page.getByLabel(t.email, { exact: true }).fill("correction@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  const code = await inboxCode("correction@example.test");
  expectedFailures.push({ path: "/api/auth/verification/confirm", status: 400 });
  const input = page.getByLabel(t.verificationCode, { exact: true });
  await input.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(t.INVALID_CODE, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: t.resendCode, exact: true })).toBeDisabled();
  await input.fill(code);
  await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
  await expect(page).toHaveURL(/notice=verified$/);
});

test("SMTP failure remains unverified and recovers through an explicit resend", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  runTestCommand("docker", composeArgs(["stop", "mailpit"]));
  try {
    await settleBrowserNetwork(browser, testSettings().values.APP_ORIGIN);
    await page.goto("/en/register");
    await page.getByLabel(t.displayName, { exact: true }).fill("Delivery recovery");
    await page.getByLabel(t.email, { exact: true }).fill("delivery@example.test");
    await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
    await page.getByRole("checkbox").check();
    // A deliberately stopped SMTP host uses the bounded connection timeout.
    const delivery = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/register") && response.request().method() === "POST",
      { timeout: 30000 },
    );
    await page.getByRole("button", { name: t.register, exact: true }).click();
    expect((await delivery).status()).toBe(202);
    await expect(page).toHaveURL(/\/en\/verify-email$/);
    await expect(page.getByText(t.EMAIL_UNAVAILABLE, { exact: true })).toBeVisible();
    expect((await page.request.get("/api/account")).status()).toBe(401);
  } finally {
    runTestCommand(
      "docker",
      composeArgs([
        "up",
        "--no-deps",
        "--no-recreate",
        "-d",
        "--wait",
        "--wait-timeout",
        "30",
        "mailpit",
      ]),
    );
    await settleBrowserNetwork(browser, testSettings().values.APP_ORIGIN);
  }
  const resend = page.getByRole("button", { name: t.resendCode, exact: true });
  await expect(resend).toBeEnabled({ timeout: 75000 });
  await resend.click();
  await expect(page.getByText(t.verificationSent, { exact: true })).toBeVisible();
  await verifyEmailUi(page, "delivery@example.test");
});

test("verification uses all languages and themes at desktop and 360px", async ({ page }, info) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("Language example");
  await page.getByLabel(t.email, { exact: true }).fill("languages@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  for (const locale of ["en", "fr", "ar"] as const)
    for (const theme of ["light", "dark"])
      for (const width of [1280, 360]) {
        await page.request.post("/api/preferences", {
          headers: { Origin: testSettings().values.APP_ORIGIN },
          data: { theme },
        });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}/verify-email`);
        const text = dictionaries[locale];
        await expect(
          page.getByRole("heading", { name: text.verificationTitle, exact: true }),
        ).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        const code = page.getByLabel(text.verificationCode, { exact: true });
        await expect(code).toHaveAttribute("dir", "ltr");
        await expect(code).toHaveAttribute("autocomplete", "one-time-code");
        await code.focus();
        await expect(code).toBeFocused();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        if (
          info.project.name === "chrome" &&
          ((locale === "en" && theme === "light" && width === 1280) ||
            (locale === "ar" && theme === "dark" && width === 360))
        ) {
          const directory = resolve(".impeccable/review");
          mkdirSync(directory, { recursive: true });
          await page.screenshot({
            path: resolve(
              directory,
              width === 1280 ? "email-desktop.png" : "email-mobile-arabic.png",
            ),
            fullPage: true,
          });
        }
      }
});

test("a missing browser attempt offers registration and sign-in recovery", async ({ page }) => {
  await page.goto("/en/verify-email");
  await expect(page.getByText(t.verificationMissing, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: t.verificationRestart, exact: true }),
  ).toHaveAttribute("href", "/en/register");
  await expect(page.getByLabel(t.verificationCode, { exact: true })).toHaveCount(0);
});
