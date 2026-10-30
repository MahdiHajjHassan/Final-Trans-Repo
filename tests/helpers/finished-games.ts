import type { PrismaClient } from "@/generated/prisma/client";

// Consistent synthetic results live only in disposable test databases, never a score API.
export async function finishedHuman(
  db: PrismaClient,
  xId: string,
  oId: string,
  outcome: "X" | "O" | "DRAW",
  finishedAt = new Date(),
) {
  const sequence =
    outcome === "X"
      ? [0, 3, 1, 4, 2]
      : outcome === "O"
        ? [0, 3, 1, 4, 6, 5]
        : [0, 1, 2, 4, 3, 5, 7, 6, 8];
  const board = Array(9).fill(".");
  const moves = sequence.map((cell, i) => {
    const mark = i % 2 === 0 ? "X" : "O";
    board[cell] = mark;
    return { cell, mark, ply: i + 1 };
  });
  return db.game.create({
    data: {
      mode: "HUMAN",
      status: "FINISHED",
      xId,
      oId,
      board: board.join(""),
      turn: null,
      winner: outcome === "DRAW" ? null : outcome,
      reason: outcome === "DRAW" ? "FULL_BOARD" : "LINE",
      finishedAt,
      moves: { create: moves },
    },
  });
}
