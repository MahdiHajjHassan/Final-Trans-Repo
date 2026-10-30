import type { Page } from "@playwright/test";
import { test, expect, loginUi, loginApi } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";

async function play(x: Page, o: Page, cells: number[]) {
  for (const [i, cell] of cells.entries()) {
    const page = i % 2 === 0 ? x : o,
      button = page.locator(`[data-cell="${cell}"]`);
    await expect(button).toHaveAttribute("aria-disabled", "false");
    await button.click();
    await expect(button.locator("svg")).toBeVisible();
  }
}
test("four profiles complete semifinals, draw replay and final", async ({ page, browser }) => {
  test.setTimeout(90000);
  await loginUi(page);
  await page.goto("/en/tournaments");
  await expect(
    page.getByRole("heading", { name: "Tournaments", exact: true, level: 1 }),
  ).toBeVisible();
  const settings = testSettings(),
    contexts = await Promise.all(
      Array.from({ length: 3 }, () =>
        browser.newContext({ baseURL: settings.values.APP_ORIGIN, ignoreHTTPSErrors: false }),
      ),
    );
  try {
    const peers = await Promise.all(contexts.map((c) => c.newPage()));
    for (const [i, who] of (["b", "c", "d"] as const).entries()) {
      await loginApi(contexts[i].request, who);
    }
    await page.getByRole("button", { name: "Create tournament", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/tournaments\/[0-9a-f-]{36}$/);
    const eventId = page.url().split("/").at(-1)!,
      code = await page.getByLabel("Tournament code").inputValue();
    for (const peer of peers) {
      await peer.goto("/en/tournaments");
      await peer.getByLabel("Tournament code").fill(code);
      await peer.getByRole("button", { name: "Join tournament", exact: true }).click();
      await expect(peer).toHaveURL(new RegExp(`/en/tournaments/${eventId}$`));
    }
    await expect(page.getByRole("button", { name: "Start tournament", exact: true })).toBeEnabled();
    await expect(page.locator('[data-slot="SF1"]')).toContainText("Member A / Member B");
    await expect(page.locator('[data-slot="SF2"]')).toContainText("Member C / Member D");
    await page.getByRole("button", { name: "Start tournament", exact: true }).click();
    const all = [page, ...peers];
    for (const participant of all) {
      await participant.goto(`/en/tournaments/${eventId}`);
      await participant.getByRole("link", { name: "Play match", exact: true }).click();
    }
    const sf2Id = peers[1].url().split("/").at(-1)!;
    expect((await page.request.get(`/api/games/${sf2Id}`)).status()).toBe(403);
    await play(page, peers[0], [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    for (const participant of [page, peers[0]]) {
      await participant
        .getByRole("link", { name: "Back to tournament", exact: true })
        .first()
        .click();
      await participant.getByRole("link", { name: "Play match", exact: true }).click();
    }
    await play(peers[0], page, [0, 3, 1, 4, 2]);
    await play(peers[1], peers[2], [0, 3, 1, 4, 2]);
    for (const participant of [peers[0], peers[1]]) {
      await participant.goto(`/en/tournaments/${eventId}`);
      await participant.getByRole("link", { name: "Play match", exact: true }).click();
    }
    await play(peers[0], peers[1], [0, 3, 1, 4, 2]);
    await page.goto(`/en/tournaments/${eventId}`);
    await expect(page.locator(".tournament-champion")).toContainText("Member B");
    await page.reload();
    const finalBracket = (await (await page.request.get(`/api/tournaments/${eventId}`)).json())
      .data;
    expect(finalBracket.status).toBe("FINISHED");
    expect(finalBracket.championSlot).toBe(2);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
