import type { Prisma } from "@/generated/prisma/client";
import type { GameDTO, GameReason, Mark, Player } from "@/shared/games";
import { decodeBoard, evaluateBoard } from "./engine/game.engine";

// Load the players' public names with the game; their private account fields are not needed.
export const gameInclude = {
  x: { select: { displayName: true } },
  o: { select: { displayName: true } },
  tournamentMatch: { select: { id: true, tournamentId: true } },
} satisfies Prisma.GameInclude;
export type GameRecord = Prisma.GameGetPayload<{ include: typeof gameInclude }>;

// The board the browser receives, with dates as strings and labels for computer/deleted
// players.
export function gameDto(game: GameRecord): GameDTO {
  const cells = decodeBoard(game.board);
  const human = (user: { displayName: string } | null): Player =>
    user
      ? { displayName: user.displayName, kind: "HUMAN" }
      : { displayName: "Deleted player", kind: "DELETED" };
  return {
    id: game.id,
    tournament: game.tournamentMatch
      ? { id: game.tournamentMatch.tournamentId, matchId: game.tournamentMatch.id }
      : null,
    mode: game.mode,
    cells,
    players: {
      X: human(game.x),
      O:
        game.mode === "AI"
          ? { displayName: "Computer", kind: "AI" }
          : game.o
            ? human(game.o)
            : game.status === "WAITING" || game.status === "CANCELLED"
              ? null
              : human(null),
    },
    status: game.status,
    turn: game.turn as Mark | null,
    winner: game.winner as Mark | null,
    reason: game.reason as GameReason,
    winningLine: evaluateBoard(cells).winningLine,
    version: game.version,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    finishedAt: game.finishedAt?.toISOString() ?? null,
  };
}
