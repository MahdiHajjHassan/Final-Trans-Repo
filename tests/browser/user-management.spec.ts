import sharp from "sharp";
import { test, expect, loginUi, loginApi } from "./fixtures";
import { dictionaries } from "../../src/shared/i18n/dictionaries";
import { testSettings } from "../helpers/e2e-environment";

test("profiles avatars and accepted friends work across two browser sessions", async ({
  page,
  browser,
}) => {
  const settings = testSettings();
  await loginUi(page);
  await page.goto("/en/friends");
  await expect(page.getByRole("heading", { name: "Friends", exact: true })).toBeVisible();
  const other = await browser.newContext({
    baseURL: settings.values.APP_ORIGIN,
    ignoreHTTPSErrors: false,
  });
  try {
    const b = await loginApi(other.request, "b");
    const second = await other.newPage();
    await page.getByLabel("Find a player").fill("Member B");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("link", { name: "Member B", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/en/profiles/${b.id}$`));
    await page.getByRole("button", { name: "Add friend", exact: true }).click();
    await second.goto("/en/friends?kind=incoming");
    await second.getByRole("button", { name: "Accept", exact: true }).click();
    await page.goto("/en/friends");
    await expect(page.getByRole("link", { name: "Member B", exact: true })).toBeVisible();
    await expect(page.getByText("Online", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove friend", exact: true }).click();
    await expect(page.getByRole("link", { name: "Member B", exact: true })).toHaveCount(0);
    await page.goto("/en/account");
    await page.getByLabel("Avatar image").setInputFiles({
      name: "portrait.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await page.getByRole("button", { name: "Upload avatar", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Avatar image")).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(
        "Choose a PNG, JPEG or WebP image. SVG and animated images are not supported.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Your avatar", exact: true })).toBeVisible();
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    await page
      .getByLabel("Avatar image")
      .setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Upload avatar", exact: true }).click();
    await expect(page.getByRole("img", { name: "Your avatar", exact: true })).toHaveAttribute(
      "src",
      /\/api\/profiles\/.*avatar\?v=/,
    );
    await page.getByRole("button", { name: "Use default avatar", exact: true }).click();
    await expect(page.getByRole("img", { name: "Your avatar", exact: true })).toHaveAttribute(
      "src",
      "/default-avatar.svg",
    );
  } finally {
    await other.close();
  }
});

test("new member screens fit Arabic mobile and preserve keyboard navigation", async ({ page }) => {
  await loginUi(page);
  await page.setViewportSize({ width: 360, height: 900 });
  for (const theme of ["light", "dark"] as const) {
    await page.goto("/ar/friends");
    const html = page.locator("html");
    if ((await html.getAttribute("data-theme")) !== theme) {
      await page
        .getByRole("button", {
          name: theme === "dark" ? dictionaries.ar.dark : dictionaries.ar.light,
          exact: true,
        })
        .click();
    }
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press("Tab");
  }
});

test("profile join dates hydrate consistently outside the server time zone", async ({
  page,
  browser,
}) => {
  await loginUi(page);
  const me = (await (await page.request.get("/api/account")).json()).data;
  const profile = (await (await page.request.get(`/api/profiles/${me.id}`)).json()).data;
  const joined = new Date(profile.joinedAt);
  // Either zone deliberately crosses the UTC calendar-day boundary for this real fixture.
  const timezoneId = joined.getUTCHours() < 12 ? "Etc/GMT+12" : "Pacific/Kiritimati";
  const other = await browser.newContext({
    baseURL: testSettings().values.APP_ORIGIN,
    ignoreHTTPSErrors: false,
    timezoneId,
    storageState: await page.context().storageState(),
  });
  try {
    const second = await other.newPage();
    const errors: string[] = [];
    second.on("pageerror", (error) => errors.push(error.message));
    second.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) errors.push(message.text());
    });
    await second.goto(`/en/profiles/${me.id}`);
    const expected = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
      joined,
    );
    await expect(second.locator(".member-heading")).toContainText(expected);
    await second.getByRole("button", { name: dictionaries.en.dark, exact: true }).click();
    expect(errors).toEqual([]);
  } finally {
    await other.close();
  }
});
