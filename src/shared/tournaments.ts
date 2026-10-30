import type { PublicProfile } from "./profiles";
export type TournamentEntryDTO = { id: string; slot: 1 | 2 | 3 | 4; profile: PublicProfile | null };
export type TournamentMatchDTO = {
  id: string;
  slot: "SF1" | "SF2" | "FINAL";
  status: "PENDING" | "ACTIVE" | "FINISHED" | "CANCELLED";
  version: number;
  entryAId: string | null;
  entryBId: string | null;
  winnerEntryId: string | null;
  attempt: number;
  currentGameId: string | null;
};
export type TournamentDTO = {
  id: string;
  status: "LOBBY" | "RUNNING" | "FINISHED" | "CANCELLED";
  version: number;
  hostId: string | null;
  championSlot: 1 | 2 | 3 | 4 | null;
  inviteCode: string | null;
  entries: TournamentEntryDTO[];
  matches: TournamentMatchDTO[];
  createdAt: string;
  finishedAt: string | null;
};
export type TournamentList = { items: TournamentDTO[]; total: number; page: number; pageSize: 10 };
