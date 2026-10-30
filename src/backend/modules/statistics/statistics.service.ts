import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { GameReason } from "@/shared/games";
import type {
  StatsSummary,
  HistoryPage,
  HistoryItem,
  LeaderboardPage,
  AchievementId,
} from "@/shared/statistics";
import { currentActor } from "../auth/session.guard";
import { publicProfile, publicProfileSelect } from "../profiles/profile-view";
import { parseInput } from "../../common/validation";
import { historyQuery, leaderboardQuery } from "./dto/statistics.schema";
import { rankedPlayers, rankedCount } from "./statistics-query";

// All views derive from saved games, so retries, restarts and migrations need no counter backfill.
export function createStatisticsService(db: PrismaClient) {
  return {
    async summary(actor: Actor | null): Promise<StatsSummary> {
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor),
          [row] = await rankedPlayers(tx, { userId: user.id, take: 1 });
        const { played, wins, losses, draws, points } = row ?? {
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
        };
        const milestones: { id: AchievementId; current: number; target: number }[] = [
          { id: "FIRST_MATCH", current: played, target: 1 },
          { id: "FIRST_WIN", current: wins, target: 1 },
          { id: "TEN_MATCHES", current: played, target: 10 },
        ];
        return {
          played,
          wins,
          losses,
          draws,
          points,
          rank: row?.rank ?? null,
          winRate: played ? Math.round((100 * wins) / played) : 0,
          level: 1 + Math.floor(points / 10),
          progress: points % 10,
          nextLevelPoints: 10,
          achievements: milestones.map((value) => ({
            ...value,
            current: Math.min(value.current, value.target),
            earned: value.current >= value.target,
          })),
        };
      });
    },
    async history(actor: Actor | null, input: unknown = {}): Promise<HistoryPage> {
      const query = parseInput(historyQuery, input);
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor);
        const where: Prisma.GameWhereInput = {
          OR: [{ xId: user.id }, { oId: user.id }],
          status: "FINISHED",
          ...(query.mode !== "ALL" ? { mode: query.mode } : {}),
        };
        const rows = await tx.game.findMany({
          where,
          include: {
            x: { select: { id: true, displayName: true } },
            o: { select: { id: true, displayName: true } },
            tournamentMatch: { select: { tournamentId: true } },
          },
          orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
          take: 10,
          skip: (query.page - 1) * 10,
        });
        const items: HistoryItem[] = rows.map((game) => {
          const ownMark = game.xId === user.id ? "X" : "O",
            other = ownMark === "X" ? game.o : game.x;
          return {
            gameId: game.id,
            mode: game.mode,
            opponent:
              game.mode === "AI"
                ? { id: null, displayName: "Computer", kind: "AI" }
                : other
                  ? { ...other, kind: "HUMAN" }
                  : { id: null, displayName: "Deleted player", kind: "DELETED" },
            outcome: !game.winner ? "DRAW" : game.winner === ownMark ? "WIN" : "LOSS",
            reason: game.reason as GameReason,
            finishedAt: (game.finishedAt ?? game.updatedAt).toISOString(),
            tournamentId: game.tournamentMatch?.tournamentId ?? null,
          };
        });
        return { items, total: await tx.game.count({ where }), page: query.page, pageSize: 10 };
      });
    },
    async leaderboard(actor: Actor | null, input: unknown = {}): Promise<LeaderboardPage> {
      const query = parseInput(leaderboardQuery, input);
      return db.$transaction(async (tx) => {
        await currentActor(tx, actor);
        const rows = await rankedPlayers(tx, { take: 25, skip: (query.page - 1) * 25 });
        const users = await tx.user.findMany({
            where: { id: { in: rows.map((row) => row.userId) } },
            select: publicProfileSelect,
          }),
          profiles = new Map(users.map((user) => [user.id, publicProfile(user)]));
        return {
          items: rows.map((row) => ({
            rank: row.rank,
            profile: profiles.get(row.userId)!,
            played: row.played,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws,
            points: row.points,
            level: 1 + Math.floor(row.points / 10),
          })),
          total: await rankedCount(tx),
          page: query.page,
          pageSize: 25,
        };
      });
    },
  };
}
export type StatisticsService = ReturnType<typeof createStatisticsService>;
