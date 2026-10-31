import { randomBytes } from "node:crypto";
import { test, expect } from "./fixtures";
import { dictionaries } from "../../src/shared/i18n/dictionaries";

for (const locale of ["en", "fr", "ar"] as const) {
  test(`reading registration legal documents preserves the ${locale} form`, async ({ page }) => {
    const t = dictionaries[locale];
    const draftPassword = randomBytes(20).toString("hex");
    await page.setViewportSize({ width: locale === "ar" ? 390 : 1280, height: 900 });
    await page.goto(`/${locale}/register`);
    await page.getByLabel(t.displayName, { exact: true }).fill("Legal review demo");
    await page.getByLabel(t.email, { exact: true }).fill("legal-review@example.com");
    await page.getByLabel(t.password, { exact: true }).fill(draftPassword);
    await page.getByLabel(t.acceptTerms).check();

    for (const scope of [page.locator("form.form"), page.locator("footer")]) {
      for (const document of ["privacy", "terms"] as const) {
        const opened = page.waitForEvent("popup", { timeout: 2000 }).catch(() => null);
        await scope.locator(`a[href="/${locale}/${document}"]`).click();
        const legalPage = await opened;
        await expect(page).toHaveURL(new RegExp(`/${locale}/register$`));
        expect(
          legalPage,
          "Legal documents should leave registration open in its original tab",
        ).not.toBeNull();
        await expect(
          legalPage!.getByRole("heading", { name: t[document], exact: true }),
        ).toBeVisible();
        await legalPage!.close();
        await expect(page.getByLabel(t.displayName, { exact: true })).toHaveValue(
          "Legal review demo",
        );
        await expect(page.getByLabel(t.email, { exact: true })).toHaveValue(
          "legal-review@example.com",
        );
        expect(
          (await page.getByLabel(t.password, { exact: true }).inputValue()) === draftPassword,
        ).toBe(true);
        await expect(page.getByLabel(t.acceptTerms)).toBeChecked();
      }
    }
  });
}
