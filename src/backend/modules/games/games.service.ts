import { randomInt } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { GameDTO, GameList, GameView, Mark } from "@/shared/games";
import { currentActor } from "../auth/session.guard";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import { withWriteRetry } from "../../database/write-retry";
import { createRateLimiter } from "../../common/security/rate-limit";
import {
  createGameSchema,
  joinGameSchema,
  moveSchema,
  revisionSchema,
  gameIdSchema,
  listGamesSchema,
} from "./dto/game.schema";
import { gameDto, gameInclude, type GameRecord } from "./game-view";
import { applyMove, decodeBoard, encodeBoard } from "./engine/game.engine";
import { chooseAiMove } from "./ai/ai";
type Options = { random?: () => number; publish?: (id: string, version: number) => void };

// An eight-character room code, leaving out letters and digits that are easy to confuse.
function invitation() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

// The rules around saved games: create, join, read, play, resign and cancel.
// The engine checks the board; this service checks players and saves the result.
export function createGameService(db: PrismaClient, options: Options = {}) {
  const quota = createRateLimiter(db);

  // Limits game writes per account and action group.
  async function limit(actor: Actor | null, scope: string, max: number) {
    if (!actor) throw new DomainError("UNAUTHENTICATED");
    const result = await quota(scope, actor.id, max, 60);
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
  }

  // Loads a game for one of its players. A game ID alone does not grant access.
  async function record(tx: Prisma.TransactionClient, actor: Actor | null, id: string) {
    const user = await currentActor(tx, actor);
    const game = await tx.game.findUnique({
      where: { id: parseInput(gameIdSchema, id) },
      include: gameInclude,
    });
    if (!game) throw new DomainError("NOT_FOUND");
    if (game.xId !== user.id && game.oId !== user.id) throw new DomainError("FORBIDDEN");
    return { game, mark: (game.xId === user.id ? "X" : "O") as Mark };
  }

  // Adds this viewer's mark. Only the waiting room's creator receives its invitation code.
  function view(game: GameRecord, actor: Actor): GameView {
    return {
      game: gameDto(game),
      viewerMark: game.xId === actor.id ? "X" : "O",
      inviteCode: game.status === "WAITING" && game.xId === actor.id ? game.inviteCode : null,
    };
  }

  // Runs the write and then tells the live streams about the committed version.
  async function changed(action: () => Promise<GameDTO>) {
    const result = await withWriteRetry(action);
    options.publish?.(result.id, result.version);
    return result;
  }
  return {
    // The creator plays X. A friend game waits for O; a computer game starts at once.
    async create(actor: Actor | null, input: unknown): Promise<GameView> {
      const data = parseInput(createGameSchema, input);
      await limit(actor, "game-create", 10);

      // A unique-value collision gets a fresh game ID/code on the next attempt.
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await withWriteRetry(() =>
            db.$transaction(async (tx) => {
              const user = await currentActor(tx, actor);
              const game = await tx.game.create({
                data: {
                  mode: data.mode,
                  xId: user.id,
                  status: data.mode === "AI" ? "ACTIVE" : "WAITING",
                  turn: data.mode === "AI" ? "X" : null,
                  inviteCode: data.mode === "HUMAN" ? invitation() : null,
                },
                include: gameInclude,
              });
              return view(game, user);
            }),
          );
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2002" ||
            attempt === 4
          )
            throw error;
        }
      }
      throw new DomainError("CONFLICT");
    },

    // The second player claims O with a room code. The creator cannot join their own room.
    async join(actor: Actor | null, input: unknown): Promise<GameView> {
      const data = parseInput(joinGameSchema, input);
      await limit(actor, "game-join", 20);
      const result = await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const user = await currentActor(tx, actor);
          const game = await tx.game.findUnique({
            where: { inviteCode: data.code },
            include: gameInclude,
          });
          if (!game) throw new DomainError("NOT_FOUND");
          if (game.status !== "WAITING" || game.xId === user.id) throw new DomainError("CONFLICT");

          // Only one player can claim the empty seat.
          const updated = await tx.game.updateMany({
            where: { id: game.id, version: game.version, status: "WAITING", oId: null },
            data: { oId: user.id, status: "ACTIVE", turn: "X", version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new DomainError("CONFLICT");
          return view(
            (await tx.game.findUnique({ where: { id: game.id }, include: gameInclude }))!,
            user,
          );
        }),
      );
      options.publish?.(result.game.id, result.game.version);
      return result;
    },

    // The full saved state for this player, used on first load and after reconnecting.
    async read(actor: Actor | null, id: string): Promise<GameView> {
      return db.$transaction(async (tx) => {
        const { game } = await record(tx, actor, id);
        return view(game, actor!);
      });
    },

    // The caller's current and past games, newest first, ten per page.
    async listMine(actor: Actor | null, input: unknown = {}): Promise<GameList> {
      const query = parseInput(listGamesSchema, input);
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor);
        const where = { OR: [{ xId: user.id }, { oId: user.id }] };
        const [items, total] = await Promise.all([
          tx.game.findMany({
            where,
            include: gameInclude,
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * 10,
            take: 10,
          }),
          tx.game.count({ where }),
        ]);
        return { items: items.map(gameDto), total, page: query.page, pageSize: 10 };
      });
    },

    // Plays one move for the caller. Against the computer, its reply is saved in the same
    // transaction.
    async move(actor: Actor | null, id: string, input: unknown): Promise<GameDTO> {
      const data = parseInput(moveSchema, input);
      await limit(actor, "game-action", 60);
      return changed(() =>
        db.$transaction(async (tx) => {
          const { game, mark } = await record(tx, actor, id);
          if (
            game.version !== data.expectedVersion ||
            game.status !== "ACTIVE" ||
            game.turn !== mark
          )
            throw new DomainError("CONFLICT");

          // 1. The session, turn and version passed the checks above; ask the engine to play.
          let moved = applyMove(decodeBoard(game.board), mark, data.cell);
          const moves = [
            {
              gameId: game.id,
              ply: game.board.replaceAll(".", "").length + 1,
              mark,
              cell: data.cell,
            },
          ];

          // 2. A finished human move needs no computer reply; otherwise, play O now.
          if (game.mode === "AI" && !moved.winner && !moved.draw) {
            const cell = chooseAiMove(moved.cells, options.random);
            if (cell !== null) {
              moved = applyMove(moved.cells, "O", cell);
              moves.push({ gameId: game.id, ply: moves[0].ply + 1, mark: "O", cell });
            }
          }
          const terminal = Boolean(moved.winner || moved.draw);

          // 3. Save the board and move records together. The version check catches another writer.
          const result = await tx.game.updateMany({
            where: { id: game.id, version: data.expectedVersion, status: "ACTIVE" },
            data: {
              board: encodeBoard(moved.cells),
              version: { increment: moves.length },
              turn: terminal ? null : game.mode === "AI" ? "X" : mark === "X" ? "O" : "X",
              status: terminal ? "FINISHED" : "ACTIVE",
              winner: moved.winner,
              reason: moved.winner ? "LINE" : moved.draw ? "FULL_BOARD" : null,
              finishedAt: terminal ? new Date() : null,
            },
          });
          if (result.count !== 1) throw new DomainError("CONFLICT");

          // If storing the move history fails, the board update rolls back with it.
          await tx.gameMove.createMany({ data: moves });
          return gameDto(
            (await tx.game.findUnique({ where: { id: game.id }, include: gameInclude }))!,
          );
        }),
      );
    },

    // Giving up an active game awards the win to the other mark.
    async resign(actor: Actor | null, id: string, input: unknown): Promise<GameDTO> {
      const data = parseInput(revisionSchema, input);
      await limit(actor, "game-action", 60);
      return changed(() =>
        db.$transaction(async (tx) => {
          const { game, mark } = await record(tx, actor, id);
          if (game.status !== "ACTIVE" || game.version !== data.expectedVersion)
            throw new DomainError("CONFLICT");
          const result = await tx.game.updateMany({
            where: { id: game.id, version: data.expectedVersion, status: "ACTIVE" },
            data: {
              status: "FINISHED",
              winner: mark === "X" ? "O" : "X",
              reason: "RESIGNED",
              turn: null,
              finishedAt: new Date(),
              version: { increment: 1 },
            },
          });
          if (result.count !== 1) throw new DomainError("CONFLICT");
          return gameDto(
            (await tx.game.findUnique({ where: { id: game.id }, include: gameInclude }))!,
          );
        }),
      );
    },

    // Only X can cancel a room, and only while it still waits for a second player.
    async cancel(actor: Actor | null, id: string, input: unknown): Promise<GameDTO> {
      const data = parseInput(revisionSchema, input);
      await limit(actor, "game-action", 60);
      return changed(() =>
        db.$transaction(async (tx) => {
          const { game, mark } = await record(tx, actor, id);
          if (game.status !== "WAITING" || mark !== "X" || game.version !== data.expectedVersion)
            throw new DomainError("CONFLICT");
          const result = await tx.game.updateMany({
            where: { id: game.id, version: data.expectedVersion, status: "WAITING" },
            data: { status: "CANCELLED", turn: null, version: { increment: 1 } },
          });
          if (result.count !== 1) throw new DomainError("CONFLICT");
          return gameDto(
            (await tx.game.findUnique({ where: { id: game.id }, include: gameInclude }))!,
          );
        }),
      );
    },
  };
}
export type GameService = ReturnType<typeof createGameService>;
