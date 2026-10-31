import { Prisma } from "@/generated/prisma/client";

// Count each human seat once. Automatic deletion forfeits and computer games never rank.
const competitive = Prisma.sql`
 WITH seats AS (
  SELECT "xId" AS owner,
   CASE WHEN winner='X' THEN 1 ELSE 0 END AS win,
   CASE WHEN winner='O' THEN 1 ELSE 0 END AS loss,
   CASE WHEN winner IS NULL THEN 1 ELSE 0 END AS draw
  FROM "Game" WHERE mode='HUMAN' AND status='FINISHED'
   AND reason IN ('LINE','FULL_BOARD','RESIGNED') AND "xId" IS NOT NULL
  UNION ALL
  SELECT "oId" AS owner,
   CASE WHEN winner='O' THEN 1 ELSE 0 END AS win,
   CASE WHEN winner='X' THEN 1 ELSE 0 END AS loss,
   CASE WHEN winner IS NULL THEN 1 ELSE 0 END AS draw
  FROM "Game" WHERE mode='HUMAN' AND status='FINISHED'
   AND reason IN ('LINE','FULL_BOARD','RESIGNED') AND "oId" IS NOT NULL
 ), totals AS (
  SELECT owner AS "userId", COUNT(*) AS played, SUM(win) AS wins,
   SUM(loss) AS losses,SUM(draw) AS draws,3*SUM(win)+SUM(draw) AS points
  FROM seats GROUP BY owner
 ), ranked AS (
  SELECT totals.*,ROW_NUMBER() OVER(ORDER BY points DESC,wins DESC,u."createdAt" ASC,u.id ASC) AS rank
  FROM totals JOIN "User" u ON u.id=totals."userId"
 )`;
export type Aggregate = {
  userId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  rank: number;
};
type Raw = Record<Exclude<keyof Aggregate, "userId">, number | bigint | null> & {
  userId: string | null;
  total: number | bigint;
};
export type RankingPage = { rows: Aggregate[]; total: number };

// Both references share the same materialized ranked CTE. LEFT JOIN preserves the
// total even when an out-of-range page (or an unranked user) has no selected rows.
export async function rankedPlayers(
  tx: Prisma.TransactionClient,
  query: { userId?: string; skip?: number; take?: number },
): Promise<RankingPage> {
  const rows = await tx.$queryRaw<Raw[]>(
    Prisma.sql`${competitive}, selected AS (
      SELECT * FROM ranked ${query.userId ? Prisma.sql`WHERE "userId"=${query.userId}` : Prisma.empty}
      ORDER BY rank LIMIT ${query.take ?? 25} OFFSET ${query.skip ?? 0}
    ) SELECT selected.*, counts.total FROM (SELECT COUNT(*) AS total FROM ranked) counts
      LEFT JOIN selected ON 1=1 ORDER BY selected.rank`,
  );
  return {
    total: Number(rows[0].total),
    rows: rows
      .filter((row) => row.userId !== null)
      .map((row) => ({
        userId: row.userId!,
        played: Number(row.played),
        wins: Number(row.wins),
        losses: Number(row.losses),
        draws: Number(row.draws),
        points: Number(row.points),
        rank: Number(row.rank),
      })),
  };
}
