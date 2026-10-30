import Link from "next/link";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import type { LeaderboardPage } from "@/shared/statistics";
import { Leaderboard } from "@/frontend/features/statistics/components/Leaderboard";
import { Alert } from "@/frontend/components/ui";
export const metadata = { robots: { index: false, follow: false } };
export default async function Standings({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await pageLocale(params),
    actor = await requirePageActor(locale),
    query = await searchParams;
  let standings: LeaderboardPage | null = null;
  try {
    standings = await (await getServices()).statistics.leaderboard(actor, query);
  } catch (error) {
    if (!(error instanceof DomainError && error.code === "VALIDATION")) throw error;
  }
  if (!standings)
    return (
      <>
        <h1>{t.leaderboard}</h1>
        <Alert tone="error">
          {t.VALIDATION} <Link href={`/${locale}/leaderboard`}>{t.refresh}</Link>
        </Alert>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.leaderboard}</h1>
          <p>{t.leaderboardDescription}</p>
        </div>
        <Link href={`/${locale}/history`}>{t.history}</Link>
      </div>
      <p>{t.rankingRules}</p>
      <Leaderboard standings={standings} locale={locale} />
    </>
  );
}
