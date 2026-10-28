import { describe, expect, it } from "vitest";

describe("complete locale dictionaries", () => {
  it("provides the same nonempty translated keys for English, French and Arabic", async () => {
    const { dictionaries } = await import("../../src/shared/i18n/dictionaries");
    const englishKeys = Object.keys(dictionaries.en).sort();
    expect(englishKeys.length).toBeGreaterThan(100);
    for (const locale of ["fr", "ar"] as const) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(englishKeys);
      for (const value of Object.values(dictionaries[locale]))
        expect(value.trim().length).toBeGreaterThan(0);
      expect(dictionaries[locale].privacyBody).not.toEqual(dictionaries.en.privacyBody);
      expect(dictionaries[locale].CONFLICT).not.toEqual(dictionaries.en.CONFLICT);
    }
  });
  it("validates preferences and preserves path and query on a locale switch", async () => {
    const { isLocale, localePath, readTheme } = await import("../../src/shared/i18n/config");
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("../en")).toBe(false);
    expect(readTheme("dark")).toBe("dark");
    expect(readTheme("anything")).toBe("light");
    expect(localePath("/en/tasks", "q=hello&page=2", "fr")).toBe("/fr/tasks?q=hello&page=2");
  });
});
