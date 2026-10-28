import type { Locator, Page } from "@playwright/test";
import { test, expect, t, loginUi, loginApi, credentials } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";

async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const values = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const border = luminance(style.borderTopColor),
      background = luminance(style.backgroundColor);
    return (Math.max(border, background) + 0.05) / (Math.min(border, background) + 0.05);
  });
}

async function theme(page: Page, value: "light" | "dark") {
  if ((await page.locator("html").getAttribute("data-theme")) !== value) {
    await page
      .getByRole("button", { name: value === "dark" ? t.dark : t.light, exact: true })
      .click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", value);
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

test("inputs, secondary actions and playable cells have visible boundaries in both themes", async ({
  page,
}) => {
  await page.goto("/en/login");
  for (const value of ["light", "dark"] as const) {
    await theme(page, value);
    expect
      .soft(await contrast(page.getByLabel(t.email, { exact: true })), `${value} input boundary`)
      .toBeGreaterThanOrEqual(3);
    expect
      .soft(
        await contrast(
          page.getByRole("button", { name: value === "light" ? t.dark : t.light, exact: true }),
        ),
        `${value} secondary action boundary`,
      )
      .toBeGreaterThanOrEqual(3);
  }
  await loginUi(page);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  const cell = page.locator(".game-cell").first();
  for (const value of ["light", "dark"] as const) {
    await theme(page, value);
    await expect(cell).toHaveAttribute("aria-disabled", "false");
    expect.soft(await contrast(cell), `${value} playable cell boundary`).toBeGreaterThanOrEqual(3);
  }
});

test("registration validates email format before sending an account request", async ({
  page,
  expectedFailures,
}) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("Validation example");
  const email = page.getByLabel(t.email, { exact: true });
  await email.fill("example@localhost");
  await page.getByLabel(t.password, { exact: true }).fill("Demonstration-Password-42");
  await page.getByRole("checkbox").check();
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/auth/register"))
      writes.push(request.url());
  });
  expectedFailures.push({ path: "/api/auth/register", status: 400 });
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  expect(writes).toEqual([]);
  await expect(email).toHaveAttribute("aria-invalid", "true");
});

test("registration rejects malformed names before form serialization changes them", async ({
  page,
}) => {
  await page.goto("/en/register");
  const name = page.getByLabel(t.displayName, { exact: true });
  await name.evaluate((input) => {
    (input as HTMLInputElement).value = `Invalid${String.fromCharCode(0xd800)}`;
  });
  await page.getByLabel(t.email, { exact: true }).fill("unicode-browser@example.test");
  await page.getByLabel(t.password, { exact: true }).fill("Demonstration-Password-42");
  await page.getByRole("checkbox").check();
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/auth/register"))
      writes.push(request.url());
  });
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(writes).toEqual([]);
});

test("sign-in rejects a malformed password before serialization can authenticate its alias", async ({
  page,
}) => {
  const email = "unicode-password@example.test";
  const created = await page.request.post("/api/auth/register", {
    headers: { Origin: testSettings().values.APP_ORIGIN },
    data: { email, displayName: "Unicode password example", password: "correct-password-\ufffd" },
  });
  expect(created.status()).toBe(201);
  await page.goto("/en/login");
  await page.getByLabel(t.email, { exact: true }).fill(email);
  const password = page.getByLabel(t.password, { exact: true });
  await password.evaluate((input) => {
    (input as HTMLInputElement).value = `correct-password-${String.fromCharCode(0xd800)}`;
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/auth/login"))
      writes.push(request.url());
  });
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(password).toHaveAttribute("aria-invalid", "true");
  expect(writes).toEqual([]);
});

test("account edits reject malformed names before sending a profile request", async ({ page }) => {
  await loginUi(page);
  await page.goto("/en/account");
  const name = page.getByLabel(t.displayName, { exact: true });
  await name.evaluate((input) => {
    (input as HTMLInputElement).value = `Invalid${String.fromCharCode(0xdc00)}`;
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/api/account"))
      writes.push(request.url());
  });
  await page.getByRole("button", { name: t.save, exact: true }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(writes).toEqual([]);
});

test("password changes reject malformed replacements before sending a request", async ({
  page,
}) => {
  await loginUi(page);
  await page.goto("/en/account");
  await page.getByLabel(t.currentPassword, { exact: true }).fill(credentials().password);
  const password = page.getByLabel(t.newPassword, { exact: true });
  await password.evaluate((input) => {
    (input as HTMLInputElement).value = `new-safe-password-${String.fromCharCode(0xd800)}`;
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes("/api/account/password"))
      writes.push(request.url());
  });
  await page.getByRole("button", { name: t.changePassword, exact: true }).click();
  await expect(password).toHaveAttribute("aria-invalid", "true");
  expect(writes).toEqual([]);
});

test("registration and profile editing preserve valid accented, Arabic and emoji names", async ({
  page,
}) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("  Joël جوزيف 🎲  ");
  await page.getByLabel(t.email, { exact: true }).fill("valid-unicode@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/login\?notice=registered$/);
  await page.getByLabel(t.email, { exact: true }).fill("valid-unicode@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/play$/);
  await page.goto("/en/account");
  const name = page.getByLabel(t.displayName, { exact: true });
  await expect(name).toHaveValue("Joël جوزيف 🎲");
  await name.fill("  Léa مها 🌍  ");
  await page.getByRole("button", { name: t.save, exact: true }).click();
  await expect(page.getByText(t.saved, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(t.displayName, { exact: true })).toHaveValue("Léa مها 🌍");
});

test("admin creation rejects whitespace-only names before sending a request", async ({
  page,
  expectedFailures,
}) => {
  await loginUi(page, "admin");
  await page.goto("/en/admin/users");
  await page.getByRole("button", { name: t.createUser, exact: true }).click();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: t.createUser, exact: true }) });
  await expect(form).toHaveAttribute("method", "post");
  const name = form.getByLabel(t.displayName, { exact: true });
  await name.fill("   ");
  await form.getByLabel(t.email, { exact: true }).fill("created-browser@example.test");
  await form.getByLabel(t.password, { exact: true }).fill("Demonstration-Password-42");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/admin/users"))
      writes.push(request.url());
  });
  expectedFailures.push({ path: "/api/admin/users", status: 400 });
  await form.getByRole("button", { name: t.createUser, exact: true }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  expect(writes).toEqual([]);
  await expect(name).toHaveAttribute("aria-invalid", "true");
});

test("unhydrated sign-in and registration keep credentials out of navigation URLs", async ({
  browser,
}) => {
  for (const mode of ["login", "register"]) {
    const context = await browser.newContext({
      baseURL: testSettings().values.APP_ORIGIN,
      javaScriptEnabled: false,
      ignoreHTTPSErrors: false,
    });
    try {
      const page = await context.newPage();
      await page.goto(`/en/${mode}`);
      await page.getByLabel(t.email, { exact: true }).fill("synthetic-navigation@example.test");
      await page.getByLabel(t.password, { exact: true }).fill("Synthetic-Only-Password-42");
      if (mode === "register") {
        await page.getByLabel(t.displayName, { exact: true }).fill("Synthetic navigation");
        await page.getByRole("checkbox").check();
      }
      await page.route("**/*", (route) =>
        route.request().isNavigationRequest()
          ? route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "<main>Submission captured.</main>",
            })
          : route.continue(),
      );
      const submitted = page.waitForRequest((request) => request.isNavigationRequest());
      await page
        .getByRole("button", { name: mode === "login" ? t.login : t.register, exact: true })
        .click();
      const request = await submitted;
      expect(request.method(), `${mode} native submission method`).toBe("POST");
      expect(new URL(request.url()).searchParams.has("password")).toBe(false);
      expect(new URL(page.url()).searchParams.has("password")).toBe(false);
    } finally {
      await context.close();
    }
  }
});

test("unhydrated password changes keep both credentials out of navigation URLs", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: testSettings().values.APP_ORIGIN,
    javaScriptEnabled: false,
    ignoreHTTPSErrors: false,
  });
  try {
    await loginApi(context.request);
    const page = await context.newPage();
    await page.goto("/en/account");
    await page.getByLabel(t.currentPassword, { exact: true }).fill("Synthetic-Current-Password-42");
    await page.getByLabel(t.newPassword, { exact: true }).fill("Synthetic-New-Password-42");
    await page.route("**/*", (route) =>
      route.request().isNavigationRequest()
        ? route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<main>Submission captured.</main>",
          })
        : route.continue(),
    );
    const submitted = page.waitForRequest((request) => request.isNavigationRequest());
    await page.getByRole("button", { name: t.changePassword, exact: true }).click();
    const request = await submitted;
    expect(request.method()).toBe("POST");
    expect(new URL(request.url()).searchParams.has("currentPassword")).toBe(false);
    expect(new URL(request.url()).searchParams.has("newPassword")).toBe(false);
    expect(new URL(page.url()).searchParams.has("currentPassword")).toBe(false);
    expect(new URL(page.url()).searchParams.has("newPassword")).toBe(false);
  } finally {
    await context.close();
  }
});

test("admin edits reject whitespace-only names before sending a request", async ({
  page,
  expectedFailures,
}) => {
  await loginUi(page, "admin");
  await page.goto("/en/admin/users");
  const row = page.getByRole("row").filter({ hasText: "member-a@example.test" });
  await row.getByRole("button", { name: t.edit, exact: true }).click();
  const name = row.getByLabel(t.displayName, { exact: true });
  await name.fill("   ");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes("/api/admin/users/"))
      writes.push(request.url());
  });
  expectedFailures.push({ path: "/api/admin/users/", status: 400 });
  await row.getByRole("button", { name: t.save, exact: true }).click();
  await expect(row.getByRole("alert")).toBeVisible();
  expect(writes).toEqual([]);
  await expect(name).toHaveAttribute("aria-invalid", "true");
});
