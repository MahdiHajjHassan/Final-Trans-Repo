"use client";
import type { Cells, Mark } from "@/shared/games";
import type { Dictionary } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";

/** The nine board buttons. It reports the chosen cell; LiveGame sends the move to the server. */
export function GameBoard({
  cells,
  mark,
  disabled,
  winningLine,
  onMove,
  t,
  locale,
}: {
  cells: Cells;
  mark: Mark;
  disabled: boolean;
  winningLine: number[] | null;
  onMove: (cell: number) => void;
  t: Dictionary;
  locale: Locale;
}) {
  const number = new Intl.NumberFormat(locale);

  // Keep cell positions the same in Arabic; only the labels change.
  return (
    <div className="game-board" role="group" aria-label={t.gameBoard} dir="ltr">
      {cells.map((cell, index) => (
        <button
          className={"game-cell" + (winningLine?.includes(index) ? " winning" : "")}
          key={index}
          type="button"
          aria-disabled={disabled || cell !== null}
          data-cell={index}
          aria-label={
            t.row +
            " " +
            number.format(Math.floor(index / 3) + 1) +
            ", " +
            t.column +
            " " +
            number.format((index % 3) + 1) +
            ": " +
            (cell ?? t.emptyCell) +
            (cell ? "" : ". " + t.placeMark + " " + mark)
          }
          onClick={() => {
            // aria-disabled keeps the cell focusable; this guard stops an unavailable move.
            if (!disabled && cell === null) onMove(index);
          }}
        >
          {cell && (
            <svg
              className={"game-mark mark-" + cell.toLowerCase()}
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {cell === "X" ? (
                <path d="M24 24 76 76 M76 24 24 76" />
              ) : (
                <circle cx="50" cy="50" r="29" />
              )}
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
