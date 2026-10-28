import { test, expect } from "@playwright/test";
test("public game lobby renders rules and accessible account entry points", async ({ page }) => {
  await page.goto("/en/play");
  await expect(page.getByRole("heading", { name: "Tic Tac Toe", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to play", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }).first(),
  ).toBeVisible();
});
