import { test, expect, vi } from "vitest";
import { dictionaries } from "../../src/i18n/dictionaries";
test("sitemap lists public game and legal routes without removed task pages", async () => {
  vi.stubEnv("APP_ORIGIN", "https://localhost");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
  vi.stubEnv("ADMIN_PASSWORD", "test-only-config-password");
  try {
    const { default: sitemap } = await import("../../src/app/sitemap");
    expect(
      sitemap()
        .map((entry) => new URL(entry.url).pathname)
        .sort(),
    ).toEqual([
      "/ar/play",
      "/ar/privacy",
      "/ar/terms",
      "/en/play",
      "/en/privacy",
      "/en/terms",
      "/fr/play",
      "/fr/privacy",
      "/fr/terms",
    ]);
  } finally {
    vi.unstubAllEnvs();
  }
});
test("deleted and computer player labels are localized rather than exposing English DTO fallback text", async () => {
  const { playerLabel } = await import("../../src/shared/player-label");
  expect(playerLabel({ kind: "DELETED", displayName: "Deleted player" }, dictionaries.ar)).toBe(
    "لاعب محذوف",
  );
  expect(playerLabel({ kind: "AI", displayName: "Computer" }, dictionaries.fr)).toBe(
    dictionaries.fr.computer,
  );
  expect(playerLabel({ kind: "HUMAN", displayName: "Ali" }, dictionaries.ar)).toBe("Ali");
});
