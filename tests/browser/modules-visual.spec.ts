import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import type { APIRequestContext } from "@playwright/test";
import { test, expect, loginApi } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";
import { dictionaries } from "../../src/shared/i18n/dictionaries";

const views = [
  { locale: "en", theme: "light", width: 1280 },
  { locale: "en", theme: "dark", width: 1280 },
  { locale: "ar", theme: "light", width: 360 },
  { locale: "ar", theme: "dark", width: 360 },
] as const;
for (const view of views)
  test(`module surfaces ${view.locale} ${view.theme} ${view.width}`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(90000);
    const { locale, theme, width } = view,
      t = dictionaries[locale],
      settings = testSettings();
    await page.setViewportSize({ width, height: 900 });
    await loginApi(page.request, "a");
    const dir = resolve(".impeccable/review");
    mkdirSync(dir, { recursive: true });
    async function capture(label: string) {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        label,
      ).toBe(true);
      await page.screenshot({
        path: resolve(dir, `member-${info.project.name}-${locale}-${theme}-${width}-${label}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.goto(`/${locale}/history`);
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page
        .getByRole("button", { name: theme === "dark" ? t.dark : t.light, exact: true })
        .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await capture("history-empty");
    await page.getByRole("main").getByRole("link", { name: t.leaderboard, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: t.leaderboard })).toBeVisible();
    await capture("leaderboard-empty");
    const contexts = await Promise.all(
      Array.from({ length: 3 }, () =>
        browser.newContext({ baseURL: settings.values.APP_ORIGIN, ignoreHTTPSErrors: false }),
      ),
    );
    try {
      const ids = [];
      for (const [i, who] of (["b", "c", "d"] as const).entries())
        ids.push(await loginApi(contexts[i].request, who));
      const headers = { Origin: settings.values.APP_ORIGIN };
      async function post(client: APIRequestContext, path: string, data: unknown, status = 200) {
        const response = await client.post(path, { headers, data });
        expect(response.status(), path).toBe(status);
        return (await response.json()).data;
      }
      const changed = await contexts[0].request.patch("/api/account", {
        headers,
        data: { displayName: "Léa مها · A friend with a longer display name" },
      });
      expect(changed.status()).toBe(200);
      const friendship = await post(page.request, "/api/friends", { userId: ids[0].id });
      expect(
        (
          await contexts[0].request.patch(`/api/friends/${friendship.id}`, {
            headers,
            data: { action: "accept" },
          })
        ).status(),
      ).toBe(200);
      const png = await sharp({
        create: { width: 48, height: 48, channels: 3, background: "#74293f" },
      })
        .png()
        .toBuffer();
      expect(
        (
          await page.request.put("/api/account/avatar", {
            headers: { ...headers, "Content-Type": "image/png" },
            data: png,
          })
        ).status(),
      ).toBe(200);
      let event = await post(page.request, "/api/tournaments", {}, 201);
      const code = event.inviteCode,
        eventId = event.id;
      for (const context of contexts)
        event = await post(context.request, "/api/tournaments/join", { code });
      event = await post(page.request, `/api/tournaments/${eventId}/start`, {
        expectedVersion: event.version,
      });
      let game = (
        await (await page.request.get(`/api/games/${event.matches[0].currentGameId}`)).json()
      ).data.game;
      for (const [i, cell] of [0, 1, 2, 4, 3, 5, 7, 6, 8].entries())
        game = await post(
          i % 2 === 0 ? page.request : contexts[0].request,
          `/api/games/${game.id}/moves`,
          { cell, expectedVersion: game.version },
        );
      event = (await (await page.request.get(`/api/tournaments/${eventId}`)).json()).data;
      await post(contexts[0].request, `/api/games/${event.matches[0].currentGameId}/resign`, {
        expectedVersion: 1,
      });
      await post(contexts[2].request, `/api/games/${event.matches[1].currentGameId}/resign`, {
        expectedVersion: 1,
      });
      event = (await (await page.request.get(`/api/tournaments/${eventId}`)).json()).data;
      await post(contexts[1].request, `/api/games/${event.matches[2].currentGameId}/resign`, {
        expectedVersion: 1,
      });
      for (let i = 0; i < 8; i++) {
        const room = await post(page.request, "/api/games", { mode: "HUMAN" }, 201);
        const joined = await post(contexts[0].request, "/api/games/join", {
          code: room.inviteCode,
        });
        await post(contexts[0].request, `/api/games/${joined.game.id}/resign`, {
          expectedVersion: joined.game.version,
        });
      }
      await page.goto(`/${locale}/friends`);
      await expect(page.getByRole("heading", { level: 1, name: t.friends })).toBeVisible();
      await capture("friends");
      await page.getByRole("main").locator(`a[href="/${locale}/profiles/${ids[0].id}"]`).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Léa");
      await capture("profile");
      await page.locator(`.main-nav a[href="/${locale}/account"]`).click();
      await expect(page.getByRole("heading", { level: 1, name: t.account })).toBeVisible();
      await capture("account");
      await page.getByLabel(t.avatarImage).setInputFiles({
        name: "invalid.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page.getByRole("button", { name: t.uploadAvatar, exact: true }).click();
      await expect(page.getByLabel(t.avatarImage)).toHaveAttribute("aria-invalid", "true");
      await capture("avatar-error");
      await page.locator(`.main-nav a[href="/${locale}/history"]`).click();
      await expect(page.getByRole("heading", { level: 1, name: t.history })).toBeVisible();
      await capture("history");
      await page.getByRole("main").getByRole("link", { name: t.leaderboard, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: t.leaderboard })).toBeVisible();
      await capture("leaderboard");
      await page.locator(`.main-nav a[href="/${locale}/tournaments"]`).click();
      await page.getByRole("main").locator(`a[href="/${locale}/tournaments/${eventId}"]`).click();
      await expect(page.locator(".tournament-champion")).toBeVisible();
      await capture("tournament");
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
