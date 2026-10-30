import { test, expect, loginUi, loginApi, t } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";

test("AI history is visible without changing competitive points", async ({ page }) => {
  await loginUi(page);
  await page.goto("/en/history");
  await expect(page.getByRole("heading", { name: "History", exact: true, level: 1 })).toBeVisible();
  const before = (await (await page.request.get("/api/account/statistics")).json()).data;
  await page.goto("/en/play");
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await page.getByRole("button", { name: t.resign, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: t.resign, exact: true }).click();
  await expect(page.getByRole("heading", { name: t.lost, exact: true })).toBeVisible();
  const after = (await (await page.request.get("/api/account/statistics")).json()).data;
  expect(after.points).toBe(before.points);
  await page.goto("/en/history?mode=AI");
  await expect(page.getByRole("table")).toContainText(t.computer);
  await page.goto("/en/history?userId=someone-else");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
});

test("ten real human wins produce earned progression and a consistent leaderboard", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await loginUi(page);
  const settings = testSettings(),
    peer = await browser.newContext({
      baseURL: settings.values.APP_ORIGIN,
      ignoreHTTPSErrors: false,
    });
  try {
    await loginApi(peer.request, "b");
    const headers = { Origin: settings.values.APP_ORIGIN };
    for (let match = 0; match < 10; match++) {
      const opened = await page.request.post("/api/games", { headers, data: { mode: "HUMAN" } });
      expect(opened.status()).toBe(201);
      const room = (await opened.json()).data;
      const joined = await peer.request.post("/api/games/join", {
        headers,
        data: { code: room.inviteCode },
      });
      expect(joined.status()).toBe(200);
      let game = (await joined.json()).data.game;
      for (const [i, cell] of [0, 3, 1, 4, 2].entries()) {
        const response = await (i % 2 === 0 ? page.request : peer.request).post(
          `/api/games/${game.id}/moves`,
          { headers, data: { cell, expectedVersion: game.version } },
        );
        expect(response.status()).toBe(200);
        game = (await response.json()).data;
      }
    }
    await page.goto("/en/history");
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(11);
    await expect(page.getByText("Ten matches", { exact: true }).locator("..")).toContainText(
      "Earned",
    );
    const summary = (await (await page.request.get("/api/account/statistics")).json()).data;
    expect(summary).toMatchObject({ played: 10, wins: 10, points: 30, level: 4 });
    await page.getByRole("link", { name: "Leaderboard", exact: true }).click();
    await expect(
      page.getByRole("table").getByRole("cell", { name: "30", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await peer.close();
  }
});
