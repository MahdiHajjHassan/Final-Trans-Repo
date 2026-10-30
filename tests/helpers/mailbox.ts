import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { testSettings } from "./e2e-environment";
import { dictionaries } from "../../src/shared/i18n/dictionaries";
import type { Locale } from "../../src/shared/i18n/config";

export async function inboxCode(email: string) {
  if (!email.endsWith(".test"))
    throw new Error("The isolated mailbox helper only accepts test addresses");
  let code = "";
  await expect
    .poll(async () => {
      const base = `http://127.0.0.1:${testSettings().mailPort}`;
      const listing = await (await fetch(`${base}/api/v1/messages`)).json();
      const message = listing.messages?.find((message: { To: Array<{ Address: string }> }) =>
        message.To.some((to) => to.Address === email),
      );
      if (!message) return false;
      const content = await (await fetch(`${base}/api/v1/message/${message.ID}`)).json();
      code = content.Text?.match(/\b\d{6}\b/)?.[0] ?? "";
      return Boolean(code);
    })
    .toBe(true);
  return code;
}

export async function verifyEmailUi(page: Page, email: string, locale: Locale = "en") {
  const t = dictionaries[locale];
  await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email$`));
  await page.getByLabel(t.verificationCode, { exact: true }).fill(await inboxCode(email));
  await page.getByRole("button", { name: t.verifyEmail, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?notice=verified$`));
}

export async function verifyEmailApi(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/verification/confirm", {
    headers: { Origin: testSettings().values.APP_ORIGIN },
    data: { code: await inboxCode(email) },
  });
  expect(response.status()).toBe(200);
}
