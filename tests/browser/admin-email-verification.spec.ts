import { test, expect, loginUi, credentials, t } from "./fixtures";
import { inboxCode } from "../helpers/mailbox";
import { composeArgs, runTestCommand } from "../helpers/e2e-environment";

async function stage(page: import("@playwright/test").Page, email: string) {
  await loginUi(page, "admin");
  const ownId = (await (await page.request.get("/api/account")).json()).data.id;
  await page.goto("/en/admin/users");
  await page.getByRole("button", { name: t.createUser, exact: true }).click();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: t.createUser, exact: true }) });
  await form.getByLabel(t.displayName, { exact: true }).fill("Awaiting mailbox proof");
  await form.getByLabel(t.email, { exact: true }).fill(email);
  await form.getByLabel(t.password, { exact: true }).fill(credentials().password);
  await form.getByLabel(t.role, { exact: true }).selectOption("ADMIN");
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/admin/users",
  );
  await form.getByRole("button", { name: t.createUser, exact: true }).click();
  expect((await response).status()).toBe(202);
  await expect(page).toHaveURL(/\/en\/verify-email$/);
  return ownId;
}

test("admin user creation waits for the mailbox code before listing or granting its role", async ({
  page,
  expectedFailures,
}) => {
  const email = "pending-admin@example.test";
  const originalAdmin = await stage(page, email);
  await expect(
    page.getByRole("heading", { name: "Verify the new account", exact: true }),
  ).toBeVisible();
  await page.reload();
  const list = async () =>
    (await (await page.request.get("/api/admin/users")).json()).data.items as Array<{
      email: string;
      role: string;
    }>;
  expect((await list()).some((user) => user.email === email)).toBe(false);
  const code = await inboxCode(email);
  expectedFailures.push({ path: "/api/auth/verification/confirm", status: 400 });
  await page
    .getByLabel(t.verificationCode, { exact: true })
    .fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
  await expect(page.getByLabel(t.verificationCode, { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect((await list()).some((user) => user.email === email)).toBe(false);
  await page.getByLabel(t.verificationCode, { exact: true }).fill(code);
  await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/admin\/users\?notice=userCreated$/);
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row.getByText(t.ADMIN, { exact: true })).toBeVisible();
  expect((await (await page.request.get("/api/account")).json()).data.id).toBe(originalAdmin);
});

test("failed administrator verification delivery leaves no account and shows explicit recovery", async ({
  page,
}) => {
  const email = "undelivered-admin@example.test";
  runTestCommand("docker", composeArgs(["stop", "mailpit"]));
  try {
    await stage(page, email);
    await expect(page.getByText(t.EMAIL_UNAVAILABLE, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: t.verifyEmail, exact: true })).toBeDisabled();
    const users = (await (await page.request.get("/api/admin/users")).json()).data.items;
    expect(users.some((user: { email: string }) => user.email === email)).toBe(false);
  } finally {
    runTestCommand("docker", composeArgs(["start", "mailpit"]));
  }
});
