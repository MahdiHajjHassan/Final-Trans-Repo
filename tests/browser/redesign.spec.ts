import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { test, expect, t, loginApi } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";
import type { GameDTO, GameView } from "../../src/shared/games";

test("French administrator navigation reflows at 320px without page scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await loginApi(page.request, "admin");
  await page.goto("/fr/account");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator('.main-nav [aria-current="page"]')).toHaveCount(1);
});

test("room-code entry groups its action with the input on desktop and below the field on phones", async ({
  page,
}) => {
  await loginApi(page.request);
  await page.goto("/en/play");
  await page.evaluate(() => document.fonts.ready);
  const input = page.getByLabel(t.roomCode, { exact: true });
  const action = page.getByRole("button", { name: t.joinGame, exact: true });
  const desktopInput = await input.boundingBox();
  const desktopAction = await action.boundingBox();
  expect.soft(Math.abs(desktopInput!.y - desktopAction!.y)).toBeLessThanOrEqual(2);
  await page.setViewportSize({ width: 360, height: 900 });
  const hint = await page.getByText(t.joinHint, { exact: true }).boundingBox();
  const mobileAction = await action.boundingBox();
  expect(mobileAction!.y).toBeGreaterThanOrEqual(hint!.y + hint!.height);
});

/** Prepare a real two-player match without repeating the already-covered lobby journey. */
async function openFriendMatch(page: Page, browser: Browser) {
  const headers = { Origin: testSettings().values.APP_ORIGIN };
  await loginApi(page.request);
  const peer = await browser.newContext({
    baseURL: testSettings().values.APP_ORIGIN,
    ignoreHTTPSErrors: false,
  });
  try {
    await loginApi(peer.request, "b");
    const created = await page.request.post("/api/games", { data: { mode: "HUMAN" }, headers });
    expect(created.status()).toBe(201);
    const { data } = (await created.json()) as { data: GameView };
    const joined = await peer.request.post("/api/games/join", {
      data: { code: data.inviteCode },
      headers,
    });
    expect(joined.status()).toBe(200);
    await page.goto("/en/games/" + data.game.id);
    await expect(page.getByRole("heading", { name: t.yourTurn, exact: true })).toBeVisible();
    await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
    return { peer, id: data.game.id };
  } catch (error) {
    await peer.close();
    throw error;
  }
}

/** Complete X's top row through the real service, preserving the last saved version. */
async function finishTopRow(request: APIRequestContext, peer: BrowserContext, initial: GameDTO) {
  let game = initial;
  for (const [index, cell] of [3, 1, 4, 2].entries()) {
    const response = await (index % 2 === 0 ? peer.request : request).post(
      "/api/games/" + game.id + "/moves",
      {
        data: { cell, expectedVersion: game.version },
        headers: { Origin: testSettings().values.APP_ORIGIN },
      },
    );
    expect(response.status()).toBe(200);
    game = ((await response.json()) as { data: GameDTO }).data;
  }
}

test("confirmed board motion preserves keyboard focus, marks the current section and draws the winning trio", async ({
  page,
  browser,
}) => {
  const { peer } = await openFriendMatch(page, browser);
  try {
    const navigation = page.getByRole("navigation", { name: t.mainNavigation });
    await expect(navigation.getByRole("link", { name: t.board, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    const first = page.locator('[data-cell="0"]');
    await first.focus();
    const moved = page.waitForResponse(
      (response) => response.url().endsWith("/moves") && response.request().method() === "POST",
    );
    await first.press("Enter");
    const response = await moved;
    expect(response.status()).toBe(200);
    const initial = ((await response.json()) as { data: GameDTO }).data;
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("aria-disabled", "true");
    await expect(first.locator(".mark-enter .mark-stroke")).toHaveCount(2);
    expect(
      await first
        .locator(".mark-stroke")
        .first()
        .evaluate((stroke) => getComputedStyle(stroke).animationName),
    ).not.toBe("none");
    await expect(page.locator('.player[data-mark="O"]')).toHaveAttribute("data-active", "true");

    await finishTopRow(page.request, peer, initial);
    await expect(page.getByRole("heading", { name: t.won, exact: true })).toBeVisible();
    const line = page.locator(".game-win-line");
    for (const [attribute, value] of Object.entries({ x1: "50", y1: "50", x2: "250", y2: "50" }))
      await expect(line).toHaveAttribute(attribute, value);
    await expect(page.locator(".game-cell.winning")).toHaveCount(3);
    await expect(page.locator('.player[data-active="true"]')).toHaveCount(0);
    await expect(first).toBeFocused();

    await page.reload();
    await expect(page.getByRole("heading", { name: t.won, exact: true })).toBeVisible();
    await expect(page.locator(".game-mark")).toHaveCount(5);
    await expect(page.locator(".mark-enter, .win-enter")).toHaveCount(0);
    await expect(page.locator(".game-win-overlay")).toBeVisible();
    await expect(page.locator(".game-win-line")).toHaveCount(1);
  } finally {
    await peer.close();
  }
});

test("reduced motion shows completed marks and the result line without running animations", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { peer, id } = await openFriendMatch(page, browser);
  try {
    const moved = page.waitForResponse((response) => response.url().endsWith("/moves"));
    await page.locator('[data-cell="0"]').click();
    const initial = ((await (await moved).json()) as { data: GameDTO }).data;
    await finishTopRow(page.request, peer, initial);
    await expect(page.getByRole("heading", { name: t.won, exact: true })).toBeVisible();
    expect(page.url()).toContain(id);
    await expect(page.locator(".game-mark")).toHaveCount(5);
    await expect(page.locator(".game-win-overlay")).toBeVisible();
    await expect(page.locator(".game-win-line")).toHaveCount(1);
    const styles = await page.locator(".mark-stroke, .game-win-line").evaluateAll((strokes) =>
      strokes.map((stroke) => {
        const style = getComputedStyle(stroke);
        return {
          animation: style.animationName,
          offset: Number.parseFloat(style.strokeDashoffset),
          opacity: Number.parseFloat(style.opacity),
        };
      }),
    );
    for (const style of styles) {
      expect(style.animation).toBe("none");
      expect(style.offset).toBe(0);
      expect(style.opacity).toBe(1);
    }
    expect(
      await page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === "running").length,
      ),
    ).toBe(0);
  } finally {
    await peer.close();
  }
});

test("Arabic public, account, admin and match screens fit a phone in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const headers = { Origin: testSettings().values.APP_ORIGIN };
  async function checkRoutes(routes: string[], theme: "light" | "dark") {
    const preference = await page.request.post("/api/preferences", { data: { theme }, headers });
    expect(preference.status()).toBe(204);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${theme} ${route} must not overflow the viewport`,
      ).toBe(true);
    }
  }
  for (const theme of ["light", "dark"] as const)
    await checkRoutes(["/ar/play", "/ar/register", "/ar/privacy"], theme);
  await loginApi(page.request, "admin");
  const created = await page.request.post("/api/games", { data: { mode: "AI" }, headers });
  expect(created.status()).toBe(201);
  const { data } = (await created.json()) as { data: GameView };
  for (const theme of ["light", "dark"] as const)
    await checkRoutes(
      ["/ar/play", "/ar/account", "/ar/admin/users", "/ar/games/" + data.game.id],
      theme,
    );
});
