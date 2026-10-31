import { randomBytes } from "node:crypto";
import { test, expect, t, credentials, loginUi, loginApi } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";
import { inboxCode, verifyEmailUi } from "../helpers/mailbox";
import { dictionaries } from "../../src/shared/i18n/dictionaries";
import type { Browser, Page } from "@playwright/test";
import type { GameDTO } from "../../src/shared/games";
async function peer(browser: Browser, who: "a" | "b" = "b") {
  const context = await browser.newContext({
    baseURL: testSettings().values.APP_ORIGIN,
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  await loginUi(page, who);
  return { context, page };
}
async function room(page: Page) {
  await page.getByRole("button", { name: t.createFriend, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/games\//);
  return { url: page.url(), code: await page.getByLabel(t.roomCode, { exact: true }).inputValue() };
}
async function join(page: Page, code: string) {
  await page.getByLabel(t.roomCode, { exact: true }).fill(code);
  await page.getByRole("button", { name: t.joinGame, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/games\//);
}
async function move(page: Page, cell: number) {
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/moves") && r.request().method() === "POST",
  );
  await page.locator('[data-cell="' + cell + '"]').click();
  const result = await response;
  expect(result.status()).toBe(200);
  return (await result.json()).data;
}
test("friends see live wins and a new-room replay can end in a draw", async ({ page, browser }) => {
  await loginUi(page);
  const other = await peer(browser);
  try {
    const first = await room(page);
    await join(other.page, first.code);
    await expect(page.getByRole("heading", { name: t.yourTurn, exact: true })).toBeVisible();
    await expect(other.page.locator('[data-cell="0"]')).toBeDisabled();
    for (const [index, cell] of [0, 3, 1, 4, 2].entries())
      await move(index % 2 === 0 ? page : other.page, cell);
    await expect(page.getByRole("heading", { name: t.won, exact: true })).toBeVisible();
    await expect(other.page.getByRole("heading", { name: t.lost, exact: true })).toBeVisible();
    await expect(other.page.locator(".game-cell.winning")).toHaveCount(3);
    await page.getByRole("button", { name: t.playAgain, exact: true }).click();
    await expect(page).not.toHaveURL(first.url);
    const code = await page.getByLabel(t.roomCode, { exact: true }).inputValue();
    await other.page.getByRole("link", { name: t.backToPlay, exact: true }).click();
    await join(other.page, code);
    for (const [index, cell] of [0, 1, 2, 4, 3, 5, 7, 6, 8].entries())
      await move(index % 2 === 0 ? page : other.page, cell);
    await expect(page.getByRole("heading", { name: t.draw, exact: true })).toBeVisible();
    await expect(other.page.getByRole("heading", { name: t.draw, exact: true })).toBeVisible();
  } finally {
    await other.context.close();
  }
});
test("computer completes a real game, replay is fresh and resignation records a loss", async ({
  page,
}) => {
  await loginUi(page);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
  let terminal = false;
  for (let i = 0; i < 5; i++) {
    const cell = await page
      .locator('.game-cell[aria-disabled="false"]')
      .first()
      .getAttribute("data-cell");
    const game = await move(page, Number(cell));
    if (game.status === "FINISHED") {
      terminal = true;
      await expect(
        page.getByRole("heading", {
          name: game.winner === "X" ? t.won : game.winner === "O" ? t.lost : t.draw,
          exact: true,
        }),
      ).toBeVisible();
      break;
    }
  }
  expect(terminal).toBe(true);
  const previous = page.url();
  await page.getByRole("button", { name: t.playAgain, exact: true }).click();
  await expect(page).not.toHaveURL(previous);
  await expect(page.locator(".game-mark")).toHaveCount(0);
  await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: t.resign, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: t.resign, exact: true }).click();
  await expect(page.getByRole("heading", { name: t.lost, exact: true })).toBeVisible();
});
test("a disconnected player resynchronizes missed moves; waiting rooms can be cancelled", async ({
  page,
  browser,
}) => {
  await loginUi(page);
  const other = await peer(browser);
  try {
    const match = await room(page);
    await join(other.page, match.code);
    await expect(other.page.getByText(t.connected, { exact: true })).toBeVisible();
    await other.context.setOffline(true);
    await expect(other.page.getByText(t.connecting, { exact: true })).toBeVisible();
    await move(page, 0);
    await other.context.setOffline(false);
    await expect(other.page.getByText(t.connected, { exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(other.page.locator('[data-cell="0"] svg')).toBeVisible();
    await move(other.page, 3);
    await expect(page.locator('[data-cell="3"] svg')).toBeVisible();
    await page.getByRole("link", { name: t.backToPlay, exact: true }).click();
    await room(page);
    await page.getByRole("button", { name: t.cancelGame, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: t.cancelGame, exact: true }).click();
    await expect(page.getByRole("heading", { name: t.gameCancelled, exact: true })).toBeVisible();
  } finally {
    await other.context.close();
  }
});
test("registration, profile changes, secure cookies, password revocation and logout", async ({
  page,
  context,
}) => {
  await page.goto("/en/register");
  await page.getByLabel(t.displayName, { exact: true }).fill("New demo player");
  await page.getByLabel(t.email, { exact: true }).fill("new-player@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByLabel(t.acceptTerms).check();
  await page.getByRole("button", { name: t.register, exact: true }).click();
  await verifyEmailUi(page, "new-player@example.test");
  await page.getByLabel(t.email, { exact: true }).fill("new-player@example.test");
  await page.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: t.login, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/play$/);
  const cookie = (await context.cookies()).find((c) => c.name === "__Host-taskboard_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  await page.getByRole("link", { name: t.account, exact: true }).click();
  await page.getByLabel(t.displayName, { exact: true }).fill("Renamed player");
  await page.getByRole("button", { name: t.save, exact: true }).click();
  await expect(page.getByText(t.saved, { exact: true })).toBeVisible();
  await page.getByLabel(t.currentPassword, { exact: true }).fill(credentials().password);
  await page.getByLabel(t.newPassword, { exact: true }).fill(randomBytes(32).toString("hex"));
  await page.getByRole("button", { name: t.changePassword, exact: true }).click();
  await expect(page).toHaveURL(/notice=passwordChanged/);
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await loginUi(page);
  await page.getByRole("button", { name: t.logout, exact: true }).click();
  await expect(page.getByRole("link", { name: t.login, exact: true }).first()).toBeVisible();
  expect((await page.request.get("/api/account")).status()).toBe(401);
});
test("admin role changes are enforced and user deletion works through the interface", async ({
  page,
  browser,
  expectedFailures,
}) => {
  await loginUi(page, "admin");
  const other = await peer(browser, "a");
  try {
    await expect(other.page.getByRole("link", { name: t.users, exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: t.users, exact: true }).click();
    await page.getByRole("button", { name: t.createUser, exact: true }).click();
    const create = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: t.createUser, exact: true }) });
    await create.getByLabel(t.displayName, { exact: true }).fill("Created by admin");
    await create.getByLabel(t.email, { exact: true }).fill("created-by-admin@example.test");
    await create.getByLabel(t.password, { exact: true }).fill(credentials().password);
    await create.getByRole("button", { name: t.createUser, exact: true }).click();
    await expect(page).toHaveURL(/\/en\/verify-email$/);
    await page
      .getByLabel(t.verificationCode, { exact: true })
      .fill(await inboxCode("created-by-admin@example.test"));
    await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
    await expect(page).toHaveURL(/\/en\/admin\/users\?notice=userCreated$/);
    await expect(
      page.getByRole("row").filter({ hasText: "created-by-admin@example.test" }),
    ).toBeVisible();
    expect(
      (
        await other.page.request.post("/api/admin/users", {
          data: {
            email: "forged@example.test",
            displayName: "Forged",
            password: credentials().password,
            role: "ADMIN",
          },
          headers: { Origin: testSettings().values.APP_ORIGIN },
        })
      ).status(),
    ).toBe(403);
    const row = page.getByRole("row").filter({ hasText: "member-a@example.test" });
    await row.getByRole("button", { name: t.edit, exact: true }).click();
    await row.getByLabel(t.role, { exact: true }).selectOption("ADMIN");
    await row.getByRole("button", { name: t.save, exact: true }).click();
    await expect(row.getByText(t.ADMIN, { exact: true })).toBeVisible();
    await other.page.reload();
    await expect(other.page.getByRole("link", { name: t.users, exact: true })).toBeVisible();
    await row.getByRole("button", { name: t.edit, exact: true }).click();
    await row.getByLabel(t.role, { exact: true }).selectOption("MEMBER");
    await row.getByRole("button", { name: t.save, exact: true }).click();
    await other.page.goto("/en/admin/users");
    await expect(other.page.getByText(t.FORBIDDEN, { exact: true })).toBeVisible();
    const victim = page.getByRole("row").filter({ hasText: "member-b@example.test" });
    await victim.getByRole("button", { name: t.delete, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.confirmDelete, exact: true })
      .click();
    await expect(victim).toHaveCount(0);
    expectedFailures.push({ path: "/api/admin/users/", status: 409 });
    const administrator = page.getByRole("row").filter({ hasText: credentials("admin").email });
    await administrator.getByRole("button", { name: t.delete, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.confirmDelete, exact: true })
      .click();
    await expect(page.getByRole("dialog").getByText(t.CONFLICT, { exact: true })).toBeVisible();
  } finally {
    await other.context.close();
  }
});
test("all languages, remembered themes, mobile RTL and keyboard focus work on the board", async ({
  page,
}, info) => {
  await loginUi(page);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
  await page.getByLabel(t.language, { exact: true }).selectOption("fr");
  await expect(
    page.getByRole("heading", { name: dictionaries.fr.yourTurn, exact: true }),
  ).toBeVisible();
  await page.getByLabel(dictionaries.fr.language, { exact: true }).selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(
    page.getByRole("heading", { name: dictionaries.ar.yourTurn, exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("arabic-mobile-light.png"), fullPage: true });
  await page.getByRole("button", { name: dictionaries.ar.dark, exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText(dictionaries.ar.connected, { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("arabic-mobile-dark.png"), fullPage: true });
  const cell = page.locator('[data-cell="0"]');
  await cell.focus();
  await expect(cell).toBeFocused();
  const response = page.waitForResponse((r) => r.url().endsWith("/moves"));
  await cell.press("Enter");
  await response;
  await expect(page.locator(".game-mark")).toHaveCount(2);
  await expect(cell).toBeFocused();
});
test("server HTML contains the actual saved board with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: testSettings().values.APP_ORIGIN,
    javaScriptEnabled: false,
    ignoreHTTPSErrors: false,
  });
  try {
    await loginApi(context.request);
    const created = await context.request.post("/api/games", {
      data: { mode: "AI" },
      headers: { Origin: testSettings().values.APP_ORIGIN },
    });
    const { data } = await created.json();
    await context.request.post("/api/games/" + data.game.id + "/moves", {
      data: { cell: 0, expectedVersion: 1 },
      headers: { Origin: testSettings().values.APP_ORIGIN },
    });
    const page = await context.newPage();
    await page.goto("/en/games/" + data.game.id);
    await expect(page.locator(".game-mark")).toHaveCount(2);
    await expect(page.getByText("Member A", { exact: true })).toBeVisible();
    await expect(page).toHaveTitle(/Tic Tac Toe/);
  } finally {
    await context.close();
  }
});

test("a lost move response never retries a committed turn", async ({ page, expectedFailures }) => {
  await loginUi(page);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
  let posts = 0;
  expectedFailures.push({ path: "/moves", status: 0 });
  await page.route("**/moves", async (route) => {
    posts++;
    await route.fetch();
    await route.abort("failed");
  });
  await page.locator('[data-cell="0"]').click();
  await expect(page.locator(".game-mark")).toHaveCount(2);
  await expect(page.getByRole("alert").getByText(t.NETWORK, { exact: true })).toBeVisible();
  await page.locator('[data-cell="0"]').press("Enter");
  expect(posts).toBe(1);
  const id = page.url().split("/").at(-1),
    result = await page.request.get("/api/games/" + id),
    snapshot = (await result.json()).data.game;
  expect(snapshot.version).toBe(3);
  expect(snapshot.cells.filter((cell: unknown) => cell !== null)).toHaveLength(2);
});

test("a delayed active snapshot cannot undo the displayed terminal result", async ({ page }) => {
  await loginUi(page);
  const headers = { Origin: testSettings().values.APP_ORIGIN };
  const created = await page.request.post("/api/games", { data: { mode: "AI" }, headers }),
    initial = (await created.json()).data.game;
  const moved = await page.request.post("/api/games/" + initial.id + "/moves", {
      data: { cell: 0, expectedVersion: 1 },
      headers,
    }),
    active = (await moved.json()).data;
  const resigned = await page.request.post("/api/games/" + initial.id + "/resign", {
      data: { expectedVersion: active.version },
      headers,
    }),
    terminal = (await resigned.json()).data;
  await page.route("**/api/games/" + initial.id + "/events", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [terminal, active]
        .map((state) => "event: state\ndata: " + JSON.stringify(state) + "\n\n")
        .join(""),
    }),
  );
  const delivered = page.waitForResponse((response) => response.url().endsWith("/events"));
  await page.goto("/en/games/" + initial.id);
  await (await delivered).finished();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await expect(page.getByRole("heading", { name: t.lost, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: t.resign, exact: true })).toHaveCount(0);
});

test("an older move response cannot roll back the name received on the real stream", async ({
  page,
}) => {
  test.setTimeout(60000);
  await loginUi(page);
  await page.getByRole("button", { name: t.playComputer, exact: true }).click();
  await expect(page.getByText(t.connected, { exact: true })).toBeVisible();
  const gameId = page.url().split("/").at(-1)!;
  const moveUrl = `${testSettings().values.APP_ORIGIN}/api/games/${gameId}/moves`;
  const ownName = page.locator('.players .player[data-mark="X"] strong');
  const resign = page.getByRole("button", { name: t.resign, exact: true });
  const renamed = "Stream renamed member";
  await expect(ownName).toHaveText("Member A");

  let release!: () => void;
  const releaseResponse = new Promise<void>((resolve) => {
    release = resolve;
  });
  let committed!: (game: GameDTO) => void;
  let failed!: (error: unknown) => void;
  const serverCommitted = new Promise<GameDTO>((resolve, reject) => {
    committed = resolve;
    failed = reject;
  });
  await page.route(moveUrl, async (route) => {
    try {
      // Execute the actual write once, then hold only its browser response.
      // The authenticated SSE connection remains unmodified throughout.
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const { data } = (await response.json()) as { data: GameDTO };
      committed(data);
      await releaseResponse;
      await route.fulfill({ response });
    } catch (error) {
      failed(error);
      throw error;
    }
  });

  try {
    await page.locator('[data-cell="0"]').click();
    const saved = await serverCommitted;
    expect(saved.players.X?.displayName).toBe("Member A");
    expect(saved.cells.filter((cell) => cell !== null)).toHaveLength(2);
    await expect(page.locator(".game-mark")).toHaveCount(2);
    await expect(resign).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: t.computerThinking, exact: true }),
    ).toBeVisible();

    const changed = await page.request.patch("/api/account", {
      headers: { Origin: testSettings().values.APP_ORIGIN },
      data: { displayName: renamed },
    });
    expect(changed.status()).toBe(200);
    // No reload or manual sync: the next authenticated 15-second heartbeat
    // must refresh the name at this same saved board version.
    await expect(ownName).toHaveText(renamed, { timeout: 20000 });
    await expect(resign).toBeDisabled();

    const delivered = page.waitForResponse(
      (response) => response.url() === moveUrl && response.request().method() === "POST",
    );
    release();
    expect((await delivered).status()).toBe(200);
    await expect(resign).toBeEnabled();
    await expect(page.getByRole("heading", { name: t.yourTurn, exact: true })).toBeVisible();
    await expect(ownName).toHaveText(renamed);
    await expect(page.locator(".game-mark")).toHaveCount(2);
    for (const [cell, mark] of saved.cells.entries()) {
      const square = page.locator(`[data-cell="${cell}"]`);
      if (mark) await expect(square.locator(`.mark-${mark.toLowerCase()}`)).toBeVisible();
      else await expect(square.locator(".game-mark")).toHaveCount(0);
    }

    await page.unroute(moveUrl);
    // The displayed board has no version attribute. Its next actual write
    // exposes the client version through the existing expectedVersion contract.
    const nextRequest = page.waitForRequest(
      (request) => request.url() === moveUrl && request.method() === "POST",
    );
    const nextResponse = page.waitForResponse(
      (response) => response.url() === moveUrl && response.request().method() === "POST",
    );
    await page.locator(`[data-cell="${saved.cells.findIndex((cell) => cell === null)}"]`).click();
    expect((await nextRequest).postDataJSON().expectedVersion).toBe(saved.version);
    const accepted = await nextResponse;
    expect(accepted.status()).toBe(200);
    expect(((await accepted.json()).data as GameDTO).version).toBeGreaterThan(saved.version);
    await expect(resign).toBeEnabled();
    await expect(ownName).toHaveText(renamed);
  } finally {
    release();
    await page.unroute(moveUrl);
  }
});
