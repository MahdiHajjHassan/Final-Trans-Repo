"use client";
import Link from "@/frontend/components/AppLink";
import { useRouter } from "next/navigation";
import type { Locale } from "@/shared/i18n/config";
import type { TournamentDTO, TournamentMatchDTO } from "@/shared/tournaments";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { Button, TextField, Badge } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { request, useMutation, RequestError } from "@/frontend/lib/api";
import { useVisiblePoll } from "@/frontend/lib/use-visible-poll";

// The live bracket contains pairings and results, never another player's board.
export function TournamentBracket({
  initial,
  actorId,
  locale,
}: {
  initial: TournamentDTO;
  actorId: string;
  locale: Locale;
}) {
  const t = dictionaries[locale],
    poll = useVisiblePoll(`/api/tournaments/${initial.id}`, initial, 5000),
    row = poll.data,
    mutation = useMutation(),
    router = useRouter();
  const host = row.hostId === actorId,
    me = row.entries.find((e) => e.profile?.id === actorId);
  const name = (id: string | null, empty = t.awaitingWinner) => {
    const entry = row.entries.find((e) => e.id === id);
    return entry ? (entry.profile?.displayName ?? t.deletedPlayer) : empty;
  };
  // Show the same fixed slot pairings before start without creating any games.
  const matches: TournamentMatchDTO[] =
    row.status === "LOBBY"
      ? (["SF1", "SF2", "FINAL"] as const).map((slot, index) => ({
          id: slot,
          slot,
          status: "PENDING",
          version: 0,
          entryAId: row.entries.find((e) => e.slot === index * 2 + 1)?.id ?? null,
          entryBId: row.entries.find((e) => e.slot === index * 2 + 2)?.id ?? null,
          winnerEntryId: null,
          attempt: 0,
          currentGameId: null,
        }))
      : row.matches;
  const status = {
    LOBBY: t.tournamentLobby,
    RUNNING: t.tournamentRunning,
    FINISHED: t.tournamentFinished,
    CANCELLED: t.tournamentCancelled,
  }[row.status];
  async function action(kind: "start" | "cancel" | "leave") {
    try {
      await request(`/api/tournaments/${row.id}/${kind}`, "POST", { expectedVersion: row.version });
      if (kind === "leave") {
        router.push(`/${locale}/tournaments`);
        router.refresh();
      } else await poll.refresh();
    } catch (error) {
      if (error instanceof RequestError && error.code === "CONFLICT") await poll.refresh();
      throw error;
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.bracket}</h1>
          <p>{status}</p>
        </div>
        <Link href={`/${locale}/tournaments`}>{t.tournaments}</Link>
      </div>
      <Feedback
        error={mutation.error ?? poll.error}
        t={t}
        locale={locale}
        onRefresh={() => void poll.refresh()}
      />
      {row.status === "CANCELLED" && row.matches.length > 0 && (
        <p role="status">{t.tournamentInterrupted}</p>
      )}
      {row.status === "FINISHED" && (
        <section className="section tournament-champion">
          <h2>{t.tournamentChampion}</h2>
          <p>
            <strong>
              <bdi>
                {row.entries.find((e) => e.slot === row.championSlot)?.profile?.displayName ??
                  t.deletedPlayer}
              </bdi>
            </strong>
          </p>
        </section>
      )}
      {row.status === "LOBBY" && (
        <section className="section">
          {row.inviteCode && (
            <TextField
              name="tournamentCode"
              label={t.tournamentCode}
              value={row.inviteCode}
              readOnly
              dir="ltr"
              hint={t.tournamentCodeHelp}
            />
          )}
          <p>
            {t.registrationCapacity} <bdi>{row.entries.length}/4</bdi>
          </p>
          <div className="actions">
            {host ? (
              <>
                <Button
                  disabled={mutation.pending || row.entries.length !== 4}
                  onClick={() => void mutation.run(() => action("start"))}
                >
                  {t.startTournament}
                </Button>
                <Button
                  variant="secondary"
                  disabled={mutation.pending}
                  onClick={() => void mutation.run(() => action("cancel"))}
                >
                  {t.cancelTournament}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={mutation.pending}
                onClick={() => void mutation.run(() => action("leave"))}
              >
                {t.leaveTournament}
              </Button>
            )}
          </div>
        </section>
      )}
      <section className="section">
        <h2>{t.registeredPlayers}</h2>
        <ol className="member-list tournament-roster">
          {row.entries.map((entry) => (
            <li key={entry.id}>
              <span>
                {t.tournamentSlot} <bdi>{entry.slot}</bdi>
              </span>
              {entry.profile ? (
                <Link href={`/${locale}/profiles/${entry.profile.id}`}>
                  <bdi>{entry.profile.displayName}</bdi>
                </Link>
              ) : (
                <span>{t.deletedPlayer}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
      {matches.length > 0 && (
        <ol className="tournament-bracket">
          {matches.map((match) => (
            <li key={match.id} className="match-node" data-slot={match.slot}>
              <h2>
                {match.slot === "SF1"
                  ? t.semifinalOne
                  : match.slot === "SF2"
                    ? t.semifinalTwo
                    : t.finalMatch}
              </h2>
              <p>
                <bdi>
                  {name(
                    match.entryAId,
                    row.status === "LOBBY" && match.slot !== "FINAL" ? t.WAITING : t.awaitingWinner,
                  )}
                </bdi>{" "}
                /{" "}
                <bdi>
                  {name(
                    match.entryBId,
                    row.status === "LOBBY" && match.slot !== "FINAL" ? t.WAITING : t.awaitingWinner,
                  )}
                </bdi>
              </p>
              <Badge>
                {row.status === "LOBBY"
                  ? t.tournamentLobby
                  : match.status === "ACTIVE"
                    ? t.ACTIVE
                    : match.status === "FINISHED"
                      ? t.FINISHED
                      : match.status === "CANCELLED"
                        ? t.CANCELLED
                        : t.awaitingWinner}
              </Badge>
              {match.attempt > 1 && (
                <p>
                  {t.replayAttempt} <bdi>{match.attempt}</bdi>
                </p>
              )}
              {match.winnerEntryId && (
                <p>
                  {t.tournamentWinner}: <bdi>{name(match.winnerEntryId)}</bdi>
                </p>
              )}
              {match.currentGameId && me && [match.entryAId, match.entryBId].includes(me.id) && (
                <p>
                  <Link
                    className="button button-secondary"
                    href={`/${locale}/games/${match.currentGameId}`}
                  >
                    {match.status === "ACTIVE" ? t.playMatch : t.viewMatchResult}
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
