import Link from "next/link";
import { playerLabel } from "@/shared/player-label";
import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { formatDate } from "@/i18n/config";
import { getPageActor } from "@/server/auth/page";
import { getServices } from "@/server/services";
import { DomainError } from "@/server/errors";
import { Alert, Badge, EmptyState, Pagination } from "@/components/ui";
import { GameLobby } from "@/features/games/lobby";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { t } = await pageLocale(params);
  return { title: t.brand, description: t.metadataDescription };
}
export default async function Play({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, t } = await pageLocale(params),
    actor = await getPageActor(),
    raw = await searchParams;
  let games,
    invalid = false;
  if (actor)
    try {
      games = await (
        await getServices()
      ).games.listMine(actor, raw.page === undefined ? {} : { page: raw.page });
    } catch (error) {
      if (!(error instanceof DomainError) || error.code !== "VALIDATION") throw error;
      invalid = true;
      games = await (await getServices()).games.listMine(actor);
    }
  return (
    <>
      <div className="play-heading">
        <h1>{t.brand}</h1>
        <p>{t.playDescription}</p>
      </div>
      {actor ? (
        <GameLobby locale={locale} />
      ) : (
        <div className="guest-play">
          <p>{t.signInToPlay}</p>
          <div className="actions">
            <Link className="button button-primary" href={"/" + locale + "/login"}>
              {t.login}
            </Link>
            <Link className="button button-secondary" href={"/" + locale + "/register"}>
              {t.register}
            </Link>
          </div>
          <p>{t.computerHelp}</p>
          <p>{t.friendHelp}</p>
        </div>
      )}
      <section className="game-rules">
        <h2>{t.rulesHeading}</h2>
        <p>{t.rules}</p>
      </section>
      {games && (
        <section className="recent-games">
          <h2>{t.yourGames}</h2>
          {invalid && <Alert tone="error">{t.VALIDATION}</Alert>}
          {games.items.length ? (
            <ul className="game-list">
              {games.items.map((game) => (
                <li key={game.id}>
                  <div>
                    <strong>
                      <bdi>{playerLabel(game.players.X, t)}</bdi>
                      {" / "}
                      <bdi>{playerLabel(game.players.O, t)}</bdi>
                    </strong>
                    <p>
                      {t[game.mode]} · {formatDate(game.updatedAt, locale)}
                    </p>
                  </div>
                  <Badge>{t[game.status]}</Badge>
                  <Link
                    className="button button-secondary"
                    href={"/" + locale + "/games/" + game.id}
                  >
                    {game.status === "ACTIVE" || game.status === "WAITING" ? t.resume : t.viewGame}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t.noGames}>{t.noGamesHelp}</EmptyState>
          )}
          <Pagination
            page={games.page}
            total={games.total}
            pageSize={10}
            pathname={"/" + locale + "/play"}
            query=""
            t={t}
          />
        </section>
      )}
    </>
  );
}
