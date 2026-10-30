import Link from "next/link";
import type { HistoryPage } from "@/shared/statistics";
import type { Locale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { DataTable, Pagination } from "@/frontend/components/ui";

// Show the caller's completed games with localized labels and explicitly UTC dates.
export function MatchHistory({
  history,
  mode,
  locale,
}: {
  history: HistoryPage;
  mode: string;
  locale: Locale;
}) {
  const t = dictionaries[locale];
  return (
    <section className="section">
      <h2>{t.completedMatches}</h2>
      {!history.items.length ? (
        <p>{t.noHistory}</p>
      ) : (
        <DataTable
          caption={t.completedMatches}
          headings={[t.dateUTC, t.opponent, t.gameMode, t.result, t.actions]}
        >
          {history.items.map((row) => (
            <tr key={row.gameId}>
              <td>
                <time dateTime={row.finishedAt}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(row.finishedAt))}
                </time>
              </td>
              <td>
                {row.opponent.kind === "HUMAN" && row.opponent.id ? (
                  <Link href={`/${locale}/profiles/${row.opponent.id}`}>
                    <bdi>{row.opponent.displayName}</bdi>
                  </Link>
                ) : row.opponent.kind === "AI" ? (
                  t.computer
                ) : (
                  t.deletedPlayer
                )}
              </td>
              <td>
                {row.mode === "AI" ? t.AI : t.humanMatches}
                {row.tournamentId && (
                  <p>
                    <Link href={`/${locale}/tournaments/${row.tournamentId}`}>{t.tournaments}</Link>
                  </p>
                )}
              </td>
              <td>
                {t[row.outcome]}
                {row.reason && <small className="result-reason">{t[row.reason]}</small>}
              </td>
              <td>
                <Link href={`/${locale}/games/${row.gameId}`}>{t.viewMatchResult}</Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination
        page={history.page}
        total={history.total}
        pageSize={10}
        pathname={`/${locale}/history`}
        query={`mode=${mode}`}
        t={t}
      />
    </section>
  );
}
