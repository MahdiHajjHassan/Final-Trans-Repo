import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import { isBusy, withWriteRetry } from "../../database/write-retry";

function validToken(raw: string | null): raw is string {
  return raw !== null && /^[a-f0-9]{64}$/.test(raw);
}
function tokenHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createSessionToken(
  db: Pick<Prisma.TransactionClient, "session">,
  userId: string,
  now: Date,
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // The browser gets the token; the database only gets its hash.
  await db.session.create({ data: { id: tokenHash(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function resolveSessionToken(
  db: PrismaClient,
  raw: string | null,
  now: Date,
): Promise<Actor | null> {
  if (!validToken(raw)) return null;
  const session = await db.session.findUnique({
    where: { id: tokenHash(raw) },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= now) {
    try {
      await db.session.deleteMany({ where: { id: session.id } });
    } catch (error) {
      // The session is already expired; cleanup can wait if SQLite is busy.
      if (!isBusy(error)) throw error;
    }
    return null;
  }
  return session.user;
}

export async function revokeSessionToken(db: PrismaClient, raw: string | null): Promise<void> {
  if (validToken(raw))
    await withWriteRetry(() => db.session.deleteMany({ where: { id: tokenHash(raw) } }));
}
