import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { sessionTokenHash } from "../auth/session-token";
import { currentActor } from "../auth/session.guard";
import { DomainError } from "../../common/errors";
import { createRateLimiter } from "../../common/security/rate-limit";
import { withWriteRetry } from "../../database/write-retry";

// Presence describes a recently visible authenticated tab, never an unrevocable user flag.
export async function onlineAt(
  tx: Prisma.TransactionClient,
  userId: string,
  time: Date,
): Promise<boolean> {
  try {
    await currentActor(tx, { id: userId, role: "MEMBER" });
  } catch (error) {
    if (error instanceof DomainError && error.code === "UNAUTHENTICATED") return false;
    throw error;
  }
  return Boolean(
    await tx.session.findFirst({
      where: {
        userId,
        expiresAt: { gt: time },
        lastSeenAt: { gte: new Date(time.getTime() - 60000) },
      },
      select: { id: true },
    }),
  );
}
export function createPresenceService(db: PrismaClient, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date()),
    consume = createRateLimiter(db, now);
  return {
    async heartbeat(rawToken: string | null) {
      const id = sessionTokenHash(rawToken);
      if (!id) throw new DomainError("UNAUTHENTICATED");
      const time = now();
      const session = await db.session.findUnique({ where: { id } });
      if (!session || session.expiresAt <= time) throw new DomainError("UNAUTHENTICATED");
      await currentActor(db, { id: session.userId, role: "MEMBER" });
      const q = await consume("presence", id, 30, 60);
      if (!q.allowed) throw new DomainError("RATE_LIMITED", undefined, q.retryAfterSeconds);
      await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          await currentActor(tx, { id: session.userId, role: "MEMBER" });
          const update = await tx.session.updateMany({
            where: { id, userId: session.userId, expiresAt: { gt: time } },
            data: { lastSeenAt: time },
          });
          if (update.count !== 1) throw new DomainError("UNAUTHENTICATED");
        }),
      );
    },
  };
}
