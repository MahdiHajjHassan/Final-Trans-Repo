import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createStatisticsService } from "@/backend/modules/statistics/statistics.service";
import { dictionaries } from "@/shared/i18n/dictionaries";

// The Next request/session boundaries are supplied; statistics and page rendering remain real.
vi.mock("@/backend/services", () => ({ getServices: vi.fn() }));
vi.mock("@/backend/modules/auth/auth.pages", () => ({ requirePageActor: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) =>
    createElement("a", { ...props, "data-prefetch": String(prefetch) }),
}));
import { getServices } from "@/backend/services";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import Standings from "@/app/[locale]/leaderboard/page";
import History from "@/app/[locale]/history/page";

for (const scenario of [
  { page: History, pathname: "history", spent: 119, locale: "fr" },
  { page: History, pathname: "history", spent: 120, locale: "ar" },
  { page: Standings, pathname: "leaderboard", spent: 120, locale: "en" },
] as const) {
  test(`${scenario.pathname} renders localized recovery when ${scenario.spent === 119 ? "summary after successful history" : "initial read"} exhausts the real member budget (${scenario.locale})`, async () => {
    const f = await createTestDb();
    try {
      const a = await seedUser(f.db),
        stats = createStatisticsService(f.db, {
          now: () => new Date("2026-10-31T00:00:02Z"),
        });
      for (let i = 0; i < scenario.spent; i++) await stats.summary(a.actor);
      vi.mocked(getServices).mockResolvedValue({ statistics: stats } as Awaited<
        ReturnType<typeof getServices>
      >);
      vi.mocked(requirePageActor).mockResolvedValue(a.actor);
      const tree = await scenario.page({
        params: Promise.resolve({ locale: scenario.locale }),
        searchParams: Promise.resolve({}),
      });
      const html = renderToStaticMarkup(tree),
        t = dictionaries[scenario.locale];
      expect(html).toContain(t.RATE_LIMITED);
      expect(html).toContain(
        t.retryAfter.replace("{seconds}", new Intl.NumberFormat(scenario.locale).format(58)),
      );
      expect(html).toContain(`action="/${scenario.locale}/${scenario.pathname}"`);
      expect(html).toContain('method="get"');
      expect(html).toContain("<button");
      expect(html).toContain(t.refresh);
      expect(html).toContain('role="alert"');
      expect(html).not.toContain(t.noHistory);
      expect(html).not.toContain(t.noRankings);
      expect(html).not.toContain(t.INTERNAL);
    } finally {
      await f.close();
    }
  });
}

test("leaderboard renders recovery for an exhausted real cold-query budget without inventing empty standings", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      stats = createStatisticsService(f.db, {
        now: () => new Date("2026-10-31T00:00:02Z"),
      });
    for (let page = 1; page <= 30; page++) await stats.leaderboard(a.actor, { page });
    vi.mocked(getServices).mockResolvedValue({ statistics: stats } as Awaited<
      ReturnType<typeof getServices>
    >);
    vi.mocked(requirePageActor).mockResolvedValue(a.actor);
    const tree = await Standings({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ page: "31" }),
    });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain(dictionaries.en.RATE_LIMITED);
    expect(html).toContain(dictionaries.en.retryAfter.replace("{seconds}", "58"));
    expect(html).not.toContain(dictionaries.en.noRankings);
    expect(html).toContain('action="/en/leaderboard"');
  } finally {
    await f.close();
  }
});
