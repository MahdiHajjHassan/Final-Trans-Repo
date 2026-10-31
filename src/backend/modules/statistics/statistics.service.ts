import { Prisma, type PrismaClient } from "@/generated/prisma/client";
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
import { rankedPlayers, type RankingPage } from "./statistics-query";
import { createRateLimiter } from "../../common/security/rate-limit";
import { DomainError } from "../../common/errors";
import { withWriteRetry } from "../../database/write-retry";

// All views derive from saved games, so retries, restarts and migrations need no counter backfill.
export function createStatisticsService(db: PrismaClient, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date()),
    consume = createRateLimiter(db, now);
  // At most 128 pages/user summaries (at most 3,200 aggregate rows), shared by all callers.
  // Never retain profile data or use a time-based freshness approximation.
  const cache = new Map<string, RankingPage>();
  let cachedRevision: bigint | undefined;

  async function charge(actor: Actor | null) {
    const user = await currentActor(db, actor);
    const result = await withWriteRetry(() => consume("statistics-read", user.id, 120, 60));
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
  }

  async function ranking(tx: Prisma.TransactionClient, query: Parameters<typeof rankedPlayers>[1]) {
    const [revision] = await tx.$queryRaw<{ revision: bigint }[]>(
      Prisma.sql`SELECT revision FROM "StatisticsRevision" WHERE id=1`,
    );
    const version = BigInt(revision.revision);
    if (cachedRevision === undefined || version > cachedRevision) {
      cache.clear();
      cachedRevision = version;
    }
    const key = query.userId ? `user:${query.userId}` : `page:${query.skip ?? 0}`;
    const cached = cachedRevision === version ? cache.get(key) : undefined;
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    // Persisted shared budget applies only to expensive misses; cached navigation
    // by other members still works after exhaustion. This write shares the snapshot.
    const result = await createRateLimiter(tx, now)("statistics-aggregate", "global", 30, 60);
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
    const page = await rankedPlayers(tx, query);
    // A slower snapshot must not publish into a newer revision's cache.
    if (cachedRevision === version) {
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(key, page);
    }
    return page;
  }

  function read<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    return withWriteRetry(() => db.$transaction(operation));
  }

  return {
    async summary(actor: Actor | null): Promise<StatsSummary> {
      await charge(actor);
      return read(async (tx) => {
        const user = await currentActor(tx, actor),
          {
            rows: [row],
          } = await ranking(tx, { userId: user.id, take: 1 });
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
      await charge(actor);
      return read(async (tx) => {
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
      await charge(actor);
      return read(async (tx) => {
        await currentActor(tx, actor);
        const { rows, total } = await ranking(tx, { take: 25, skip: (query.page - 1) * 25 });
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
          total,
          page: query.page,
          pageSize: 25,
        };
      });
    },
  };
}
export type StatisticsService = ReturnType<typeof createStatisticsService>;
