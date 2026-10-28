import type { Cells, Mark } from "@/shared/games";
import { applyMove, evaluateBoard } from "../engine/game.engine";
export function chooseAiMove(cells: Cells, random: () => number = Math.random): number | null {
  const state = evaluateBoard(cells);
  if (state.winner || state.draw) return null;
  const legal = cells.flatMap((cell, i) => (cell === null ? [i] : []));
  function winning(mark: Mark) {
    return legal.find((cell) => applyMove(cells, mark, cell).winner === mark);
  }
  const win = winning("O");
  if (win !== undefined) return win;
  // Always take a win, but sometimes skip the best defensive move.
  const chance = Math.min(0.999999, Math.max(0, random()));
  if (chance < 0.85) {
    const block = winning("X");
    if (block !== undefined) return block;
    if (cells[4] === null) return 4;
    const corner = [0, 2, 6, 8].find((cell) => cells[cell] === null);
    if (corner !== undefined) return corner;
  }
  return legal[Math.floor(chance * legal.length)] ?? null;
}
