import { test, expect, t, loginApi } from "./fixtures";
import { testSettings } from "../helpers/e2e-environment";
test("public game lobby renders rules and accessible account entry points", async ({ page }) => {
  await page.goto("/en/play");
  await expect(page.getByRole("heading", { name: "Tic Tac Toe", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to play", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }).first(),
  ).toBeVisible();
});

test("public links wait for navigation intent before requesting route data", async ({ page }) => {
  const speculative: string[] = [];
  page.on("request", (request) => {
    const headers = request.headers();
    if (headers["next-router-prefetch"] === "1" || headers.rsc === "1")
      speculative.push(request.url());
  });
  await page.goto("/en/play", { waitUntil: "networkidle" });
  const signIn = page.getByRole("link", { name: "Sign in", exact: true }).first();
  await signIn.hover();
  await page.waitForTimeout(500);
  expect(speculative, "visible or hovered links must not spend the shared page quota").toEqual([]);
  await signIn.click();
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
});

test("invalid friend codes never submit and lowercase valid codes still join", async ({ page }) => {
  await loginApi(page.request);
  const created = await page.request.post("/api/games", {
    headers: { Origin: testSettings().values.APP_ORIGIN },
    data: { mode: "HUMAN" },
  });
  expect(created.status()).toBe(201);
  const room = (await created.json()).data as { game: { id: string }; inviteCode: string };
  await loginApi(page.request, "b");
  await page.goto("/en/play");
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/games/join" && request.method() === "POST")
      submissions.push(request.postData() ?? "");
  });
  const code = page.getByLabel(t.roomCode, { exact: true });
  for (const malformed of ["!!!!!!!!", "ABCD0I12", "ABCDO123"]) {
    await code.fill(malformed);
    await page.getByRole("button", { name: t.joinGame, exact: true }).click();
    expect(await code.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
    expect(submissions).toEqual([]);
  }
  await code.fill(room.inviteCode.toLowerCase());
  const joined = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/games/join" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: t.joinGame, exact: true }).click();
  expect((await joined).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/en/games/${room.game.id}$`));
  expect(submissions).toHaveLength(1);
});
