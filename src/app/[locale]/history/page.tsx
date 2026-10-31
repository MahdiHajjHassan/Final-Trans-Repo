import Link from "@/frontend/components/AppLink";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import type { HistoryPage, StatsSummary as Summary } from "@/shared/statistics";
import { StatsSummary } from "@/frontend/features/statistics/components/StatsSummary";
import { MatchHistory } from "@/frontend/features/statistics/components/MatchHistory";
import { Alert, Button, SelectField } from "@/frontend/components/ui";
export const metadata = { robots: { index: false, follow: false } };
// The server accepts only the same bounded filters as the private history API.
export default async function History({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await pageLocale(params),
    actor = await requirePageActor(locale),
    query = await searchParams,
    s = await getServices();
  let history: HistoryPage | null = null;
  let summary: Summary | null = null;
  let failure: DomainError | null = null;
  try {
    history = await s.statistics.history(actor, query);
    summary = await s.statistics.summary(actor);
  } catch (error) {
    if (!(error instanceof DomainError && ["VALIDATION", "RATE_LIMITED"].includes(error.code)))
      throw error;
    failure = error;
  }
  if (!history || !summary)
    return (
      <>
        <h1>{t.history}</h1>
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
          <form method="get" action={`/${locale}/history`}>
            <Button>{t.refresh}</Button>
          </form>
        </Alert>
      </>
    );
  const mode = typeof query.mode === "string" ? query.mode : "ALL";
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.history}</h1>
          <p>{t.historyDescription}</p>
        </div>
        <Link href={`/${locale}/leaderboard`}>{t.leaderboard}</Link>
      </div>
      <StatsSummary summary={summary} t={t} />
      <form method="get" className="search-form">
        <SelectField name="mode" label={t.gameMode} defaultValue={mode}>
          <option value="ALL">{t.allModes}</option>
          <option value="HUMAN">{t.humanMatches}</option>
          <option value="AI">{t.AI}</option>
        </SelectField>
        <Button>{t.apply}</Button>
      </form>
      <MatchHistory history={history} mode={mode} locale={locale} />
    </>
  );
}
