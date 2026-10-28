"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Dialog, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import type { GameDTO, GameView, Mark, Player } from "@/shared/games";
import { playerLabel } from "@/shared/player-label";
import { request, RequestError, useMutation } from "../../../lib/api";
import { GameBoard } from "./Board";
export function LiveGame({ initial, locale }: { initial: GameView; locale: Locale }) {
  const t = dictionaries[locale],
    router = useRouter(),
    mutation = useMutation();
  const [game, setGame] = useState(initial.game),
    [viewerMark, setViewerMark] = useState(initial.viewerMark);
  const [connected, setConnected] = useState(false),
    [confirm, setConfirm] = useState<"resign" | "cancel" | null>(null);
  const id = initial.game.id;
  const apply = useCallback((next: GameDTO) => {
    // An older response can arrive after a newer stream update.
    setGame((current) => (next.version > current.version ? next : current));
    if (next.status === "FINISHED" || next.status === "CANCELLED") setConfirm(null);
  }, []);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      source: EventSource | undefined,
      delay = 2000;
    function leave(code: string) {
      source?.close();
      stopped = true;
      window.location.replace("/" + locale + (code === "NOT_FOUND" ? "/play" : "/login"));
    }
    function recover() {
      if (stopped) return;
      source?.close();
      setConnected(false);
      if (!navigator.onLine) return;
      if (timer) return;
      timer = setTimeout(async () => {
        timer = undefined;
        if (stopped) return;
        try {
          // Read the saved board again before reconnecting the stream.
          const result = await request<GameView>("/api/games/" + id, "GET");
          if (stopped) return;
          apply(result.game);
          setViewerMark(result.viewerMark);
          delay = 2000;
          connect();
        } catch (error) {
          const code = error instanceof RequestError ? error.code : "NETWORK";
          if (["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(code)) {
            leave(code);
            return;
          }
          delay = Math.min(delay * 2, 10000);
          recover();
        }
      }, delay);
    }
    function connect() {
      if (stopped) return;
      source?.close();
      source = new EventSource("/api/games/" + id + "/events");
      source.addEventListener("state", (event) => {
        if (stopped) return;
        try {
          apply(JSON.parse((event as MessageEvent).data));
          setConnected(true);
          delay = 2000;
        } catch {
          recover();
        }
      });
      source.addEventListener("access-lost", () => leave("UNAUTHENTICATED"));
      source.addEventListener("reconnect", recover);
      source.onerror = recover;
    }
    function resume() {
      recover();
    }
    connect();
    window.addEventListener("pageshow", resume);
    window.addEventListener("offline", resume);
    window.addEventListener("online", resume);
    return () => {
      stopped = true;
      source?.close();
      clearTimeout(timer);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("offline", resume);
      window.removeEventListener("online", resume);
    };
  }, [id, locale, apply]);
  const other: Mark = viewerMark === "X" ? "O" : "X";
  const label = (player: Player) => playerLabel(player, t);
  const terminal = game.status === "FINISHED" || game.status === "CANCELLED";
  const status =
    game.status === "FINISHED"
      ? game.winner
        ? game.winner === viewerMark
          ? t.won
          : t.lost
        : t.draw
      : game.status === "CANCELLED"
        ? t.gameCancelled
        : game.status === "WAITING"
          ? t.WAITING
          : game.turn === viewerMark
            ? t.yourTurn
            : t.opponentTurn;
  async function sync() {
    const result = await request<GameView>("/api/games/" + id, "GET");
    apply(result.game);
    setViewerMark(result.viewerMark);
  }
  return (
    <section className="game-stage">
      <div className="game-top">
        <Link href={"/" + locale + "/play"}>{t.backToPlay}</Link>
        <Badge tone={connected ? "accent" : "neutral"}>
          {connected ? t.connected : t.connecting}
        </Badge>
      </div>
      <div className="players">
        <div>
          <small>
            {t.youAre} <bdi>{viewerMark}</bdi>
          </small>
          <strong>
            <bdi>{label(game.players[viewerMark])}</bdi>
          </strong>
        </div>
        <span className="versus" aria-hidden="true">
          /
        </span>
        <div>
          <small>
            {t.opponent} <bdi>{other}</bdi>
          </small>
          <strong>
            <bdi>{label(game.players[other])}</bdi>
          </strong>
        </div>
      </div>
      <h1 className="game-status" aria-live="polite" aria-atomic="true">
        {mutation.pending && game.mode === "AI" && !terminal ? t.computerThinking : status}
      </h1>
      {!connected && !terminal && <Alert>{t.connectionHelp}</Alert>}
      {game.status === "WAITING" && initial.inviteCode && (
        <div className="waiting-room">
          <TextField
            label={t.roomCode}
            value={initial.inviteCode}
            readOnly
            dir="ltr"
            onFocus={(event) => event.currentTarget.select()}
          />
          <p>{t.waitingHelp}</p>
        </div>
      )}
      <GameBoard
        cells={game.cells}
        mark={viewerMark}
        disabled={
          !connected || mutation.pending || game.status !== "ACTIVE" || game.turn !== viewerMark
        }
        winningLine={game.winningLine}
        t={t}
        locale={locale}
        onMove={(cell) =>
          void mutation.run(async () =>
            apply(
              await request<GameDTO>("/api/games/" + id + "/moves", "POST", {
                cell,
                expectedVersion: game.version,
              }),
            ),
          )
        }
      />
      {!confirm && (
        <Feedback
          error={mutation.error}
          t={t}
          locale={locale}
          onRefresh={() => void mutation.run(sync)}
        />
      )}
      <div className="game-actions">
        {terminal ? (
          <Button
            disabled={mutation.pending}
            onClick={() =>
              void mutation.run(async () => {
                const result = await request<GameView>("/api/games", "POST", { mode: game.mode });
                router.push("/" + locale + "/games/" + result.game.id);
                router.refresh();
              })
            }
          >
            {t.playAgain}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={mutation.pending || !connected}
            onClick={() => {
              mutation.clear();
              setConfirm(game.status === "WAITING" ? "cancel" : "resign");
            }}
          >
            {game.status === "WAITING" ? t.cancelGame : t.resign}
          </Button>
        )}
      </div>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "cancel" ? t.cancelGameTitle : t.resignTitle}
        closeLabel={t.cancel}
      >
        <p>{confirm === "cancel" ? t.cancelGameHelp : t.resignHelp}</p>
        <Feedback
          error={mutation.error}
          t={t}
          locale={locale}
          onRefresh={() => void mutation.run(sync)}
        />
        <Button
          variant="danger"
          disabled={mutation.pending}
          onClick={() =>
            void mutation.run(async () => {
              apply(
                await request<GameDTO>("/api/games/" + id + "/" + confirm, "POST", {
                  expectedVersion: game.version,
                }),
              );
              setConfirm(null);
            })
          }
        >
          {mutation.pending ? t.pending : confirm === "cancel" ? t.cancelGame : t.resign}
        </Button>
      </Dialog>
    </section>
  );
}
