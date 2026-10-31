import Link from "@/frontend/components/AppLink";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import type { LeaderboardPage } from "@/shared/statistics";
import { Leaderboard } from "@/frontend/features/statistics/components/Leaderboard";
import { Alert, Button } from "@/frontend/components/ui";
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
  let failure: DomainError | null = null;
  try {
    standings = await (await getServices()).statistics.leaderboard(actor, query);
  } catch (error) {
    if (!(error instanceof DomainError && ["VALIDATION", "RATE_LIMITED"].includes(error.code)))
      throw error;
    failure = error;
  }
  if (!standings)
    return (
      <>
        <h1>{t.leaderboard}</h1>
        <Alert tone="error">
          <p>{failure?.code === "RATE_LIMITED" ? t.RATE_LIMITED : t.VALIDATION}</p>
          {failure?.retryAfterSeconds && (
            <p>
              {t.retryAfter.replace(
                "{seconds}",
                new Intl.NumberFormat(locale).format(failure.retryAfterSeconds),
              )}
            </p>
          )}
          <form method="get" action={`/${locale}/leaderboard`}>
            <Button>{t.refresh}</Button>
          </form>
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
