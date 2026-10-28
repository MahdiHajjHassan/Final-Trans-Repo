import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

// Counts actions in SQLite, so separate requests share the same fixed time window.
// The key is hashed before storage; it may contain a client address or an email.
export function createRateLimiter(db: PrismaClient, now: () => Date = () => new Date()) {
  let nextPruneAt = 0;
  return async function consumeLimit(
    scope: string,
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const time = now().getTime();
    if (time >= nextPruneAt) {
      nextPruneAt = time + 60 * 60 * 1000;
      await db.rateLimitBucket.deleteMany({
        where: { windowStart: { lt: new Date(time - 24 * 60 * 60 * 1000) } },
      });
    }
    const duration = windowSeconds * 1000;
    const windowStart = Math.floor(time / duration) * duration;
    const hash = createHash("sha256").update(`${scope}\0${key}`).digest("hex");

    // Count in one database statement so concurrent requests share the limit.
    const rows = await db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
      VALUES (${hash}, ${new Date(windowStart).toISOString()}, 1)
      ON CONFLICT("key") DO UPDATE SET
        "count" = CASE WHEN "windowStart" = excluded."windowStart" THEN "count" + 1 ELSE 1 END,
        "windowStart" = excluded."windowStart"
      RETURNING "count"
    `);
    return {
      allowed: Number(rows[0].count) <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((windowStart + duration - time) / 1000)),
    };
  };
}
