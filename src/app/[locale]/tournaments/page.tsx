import Link from "@/frontend/components/AppLink";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { Pagination } from "@/frontend/components/ui";
import { TournamentLobby } from "@/frontend/features/tournaments/components/TournamentLobby";
export const metadata = { robots: { index: false, follow: false } };
export default async function Tournaments({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await pageLocale(params),
    actor = await requirePageActor(locale),
    query = await searchParams;
  const page =
    typeof query.page === "string" && /^\d{1,5}$/.test(query.page)
      ? Math.max(1, Number(query.page))
      : 1;
  const list = await (await getServices()).tournaments.listMine(actor, { page });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.tournaments}</h1>
          <p>{t.tournamentsDescription}</p>
        </div>
      </div>
      <TournamentLobby locale={locale} />
      <section className="section">
        <h2>{t.yourTournaments}</h2>
        {!list.items.length ? (
          <p>{t.noTournaments}</p>
        ) : (
          <ul className="member-list">
            {list.items.map((row) => (
              <li key={row.id}>
                <Link href={`/${locale}/tournaments/${row.id}`}>
                  {t.openTournament} ·{" "}
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
                    new Date(row.createdAt),
                  )}
                </Link>
                <span>
                  {row.status === "LOBBY"
                    ? t.tournamentLobby
                    : row.status === "RUNNING"
                      ? t.tournamentRunning
                      : row.status === "FINISHED"
                        ? t.tournamentFinished
                        : t.tournamentCancelled}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={list.page}
          total={list.total}
          pageSize={10}
          pathname={`/${locale}/tournaments`}
          query=""
          t={t}
        />
      </section>
    </>
  );
}
