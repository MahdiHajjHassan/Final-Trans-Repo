"use client";
import { useState } from "react";
import type { Cells, Mark } from "@/shared/games";
import type { Dictionary } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import { winningLineGeometry } from "../lib/board-presentation";

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
  const [initialCells] = useState(() => [...cells]);
  const [initialHasLine] = useState(() => winningLine !== null);
  const line = winningLineGeometry(winningLine);

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
              className={
                "game-mark mark-" +
                cell.toLowerCase() +
                (initialCells[index] === null ? " mark-enter" : "")
              }
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {cell === "X" ? (
                <>
                  <path className="mark-stroke" pathLength="1" d="M24 24 76 76" />
                  <path
                    className="mark-stroke mark-stroke-second"
                    pathLength="1"
                    d="M76 24 24 76"
                  />
                </>
              ) : (
                <circle className="mark-stroke" pathLength="1" cx="50" cy="50" r="29" />
              )}
            </svg>
          )}
        </button>
      ))}
      {line && (
        <svg className="game-win-overlay" viewBox="0 0 300 300" fill="none" aria-hidden="true">
          <line
            className={"game-win-line" + (initialHasLine ? "" : " win-enter")}
            {...line}
            pathLength="1"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
