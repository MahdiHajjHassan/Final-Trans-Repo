/** A decorative, finished board; real game controls are rendered only by GameBoard. */
export function GameArtwork({ compact = false }: { compact?: boolean }) {
  const cells = ["X", "O", null, null, "X", "O", "O", null, "X"];
  return (
    <div className={"game-artwork" + (compact ? " artwork-compact" : "")} aria-hidden="true">
      <div className="artwork-board" dir="ltr">
        {cells.map((mark, index) => (
          <span
            className={"artwork-cell" + (mark ? " artwork-" + mark.toLowerCase() : "")}
            key={index}
          >
            {mark && (
              <svg
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
              >
                {mark === "X" ? (
                  <path d="m28 28 44 44m0-44L28 72" />
                ) : (
                  <circle cx="50" cy="50" r="28" />
                )}
              </svg>
            )}
          </span>
        ))}
        <svg className="artwork-line" viewBox="0 0 300 300" fill="none">
          <path d="M44 44 256 256" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
