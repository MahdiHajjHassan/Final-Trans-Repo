import type { PublicProfile } from "./profiles";
import type { GameReason } from "./games";
export type AchievementId = "FIRST_MATCH" | "FIRST_WIN" | "TEN_MATCHES";
export type Achievement = { id: AchievementId; earned: boolean; current: number; target: number };
export type StatsSummary = {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  winRate: number;
  rank: number | null;
  level: number;
  progress: number;
  nextLevelPoints: 10;
  achievements: Achievement[];
};
export type HistoryItem = {
  gameId: string;
  mode: "HUMAN" | "AI";
  opponent: { id: string | null; displayName: string; kind: "HUMAN" | "AI" | "DELETED" };
  outcome: "WIN" | "LOSS" | "DRAW";
  reason: GameReason;
  finishedAt: string;
  tournamentId: string | null;
};
export type HistoryPage = { items: HistoryItem[]; total: number; page: number; pageSize: 10 };
export type LeaderboardRow = {
  rank: number;
  profile: PublicProfile;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  level: number;
};
export type LeaderboardPage = {
  items: LeaderboardRow[];
  total: number;
  page: number;
  pageSize: 25;
};
