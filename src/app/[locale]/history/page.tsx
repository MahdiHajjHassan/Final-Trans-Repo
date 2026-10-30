import Link from "next/link";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import type { HistoryPage } from "@/shared/statistics";
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
  try {
    history = await s.statistics.history(actor, query);
  } catch (error) {
    if (!(error instanceof DomainError && error.code === "VALIDATION")) throw error;
  }
  if (!history)
    return (
      <>
        <h1>{t.history}</h1>
        <Alert tone="error">
          {t.VALIDATION} <Link href={`/${locale}/history`}>{t.refresh}</Link>
        </Alert>
      </>
    );
  const summary = await s.statistics.summary(actor),
    mode = typeof query.mode === "string" ? query.mode : "ALL";
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
