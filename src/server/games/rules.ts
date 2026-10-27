import type { Cells, Mark } from "@/shared/games";
import { DomainError } from "../errors";
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function decodeBoard(board: string): Cells {
  if (!/^[XO.]{9}$/.test(board)) throw new Error("Invalid stored board");
  return [...board].map((cell) => cell === "." ? null : cell) as Cells;
}
export function encodeBoard(cells: Cells): string { return cells.map((cell) => cell ?? ".").join(""); }
export function evaluateBoard(cells: Cells) {
  for (const line of lines) {
    const mark = cells[line[0]];
    if (mark && line.every((i) => cells[i] === mark)) return { winner: mark, winningLine: line, draw: false };
  }
  return { winner: null, winningLine: null, draw: cells.every((cell) => cell !== null) };
}
export function applyMove(cells: Cells, mark: Mark, cell: number) {
  const current = evaluateBoard(cells);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new DomainError("VALIDATION");
  if (current.winner || current.draw || cells[cell] !== null) throw new DomainError("CONFLICT");
  const next = [...cells] as Cells; next[cell] = mark;
  return { cells: next, ...evaluateBoard(next) };
}
