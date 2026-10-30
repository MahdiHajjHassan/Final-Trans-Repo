export type WinningLineGeometry = { x1: number; y1: number; x2: number; y2: number };

/** Return the line through the winning cell centers in a square 300-unit board. */
export function winningLineGeometry(line: number[] | null): WinningLineGeometry | null {
  if (
    !line ||
    line.length !== 3 ||
    line.some((cell) => !Number.isInteger(cell) || cell < 0 || cell > 8)
  )
    return null;
  const cells = [...line].sort((a, b) => a - b);
  const [first, middle, last] = cells;
  const row = Math.floor(first / 3) === Math.floor(last / 3) && last - first === 2;
  const column = first % 3 === middle % 3 && middle % 3 === last % 3 && last - first === 6;
  const diagonal = middle === 4 && ((first === 0 && last === 8) || (first === 2 && last === 6));
  if (new Set(cells).size !== 3 || (!row && !column && !diagonal)) return null;
  return {
    x1: (first % 3) * 100 + 50,
    y1: Math.floor(first / 3) * 100 + 50,
    x2: (last % 3) * 100 + 50,
    y2: Math.floor(last / 3) * 100 + 50,
  };
}
