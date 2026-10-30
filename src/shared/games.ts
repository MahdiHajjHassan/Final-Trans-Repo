export type Mark = "X" | "O";
export type Cell = Mark | null;

/** Exactly nine cells, read left to right and top to bottom. Null is an empty square. */
export type Cells = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
export type GameMode = "HUMAN" | "AI";
export type GameStatus = "WAITING" | "ACTIVE" | "FINISHED" | "CANCELLED";
export type GameReason =
  "LINE" | "FULL_BOARD" | "RESIGNED" | "ACCOUNT_DELETED" | "TOURNAMENT_CANCELLED" | null;

/** Null is an empty seat. A deleted player keeps a placeholder in the saved game. */
export type Player = { displayName: string; kind: "HUMAN" | "AI" | "DELETED" } | null;

/** The saved board sent to players. It contains public names rather than account details. */
export type GameDTO = {
  id: string;
  tournament: { id: string; matchId: string } | null;
  mode: GameMode;
  cells: Cells;
  players: { X: Player; O: Player };
  status: GameStatus;
  turn: Mark | null;
  winner: Mark | null;
  reason: GameReason;
  winningLine: number[] | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

/** The same board plus the current player's mark and, for the waiting creator, a room code. */
export type GameView = { game: GameDTO; viewerMark: Mark; inviteCode: string | null };

/** A chosen cell and the saved version the player was looking at when they chose it. */
export type MoveInput = { cell: number; expectedVersion: number };

/** A page of the signed-in player's games, ten per page. */
export type GameList = { items: GameDTO[]; total: number; page: number; pageSize: 10 };
