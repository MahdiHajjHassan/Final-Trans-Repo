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
type Raw = Record<Exclude<keyof Aggregate, "userId">, number | bigint> & { userId: string };

export async function rankedPlayers(
  tx: Prisma.TransactionClient,
  query: { userId?: string; skip?: number; take?: number },
): Promise<Aggregate[]> {
  const rows = await tx.$queryRaw<Raw[]>(
    Prisma.sql`${competitive} SELECT * FROM ranked ${query.userId ? Prisma.sql`WHERE "userId"=${query.userId}` : Prisma.empty} ORDER BY rank LIMIT ${query.take ?? 25} OFFSET ${query.skip ?? 0}`,
  );
  return rows.map((row) => ({
    userId: row.userId,
    played: Number(row.played),
    wins: Number(row.wins),
    losses: Number(row.losses),
    draws: Number(row.draws),
    points: Number(row.points),
    rank: Number(row.rank),
  }));
}
export async function rankedCount(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.$queryRaw<{ total: number | bigint }[]>(
    Prisma.sql`${competitive} SELECT COUNT(*) AS total FROM ranked`,
  );
  return Number(rows[0].total);
}
