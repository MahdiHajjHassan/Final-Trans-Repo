import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import { isBusy, withWriteRetry } from "../../database/write-retry";

// Tokens are 32 random bytes written as 64 hex characters. Reject anything else early.
function validToken(raw: string | null): raw is string {
  return raw !== null && /^[a-f0-9]{64}$/.test(raw);
}

// This is the database lookup key; the raw token only belongs in the browser cookie.
function tokenHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Creates a seven-day session. Returns the raw token once, while storing only its hash.
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

// Finds the current user and role for a token. Expired sessions never count as a login.
export async function resolveSessionToken(
  db: PrismaClient,
  raw: string | null,
  now: Date,
): Promise<Actor | null> {
  if (!validToken(raw)) return null;
  const session = await db.session.findUnique({
    where: { id: tokenHash(raw) },
    include: { user: { select: { id: true, role: true, emailVerifiedAt: true } } },
  });
  if (!session || !session.user.emailVerifiedAt) return null;
  if (session.expiresAt <= now) {
    try {
      await db.session.deleteMany({ where: { id: session.id } });
    } catch (error) {
      // The session is already expired; cleanup can wait if SQLite is busy.
      if (!isBusy(error)) throw error;
    }
    return null;
  }
  return { id: session.user.id, role: session.user.role };
}

// Ends this session immediately. An absent or malformed token needs no database work.
export async function revokeSessionToken(db: PrismaClient, raw: string | null): Promise<void> {
  if (validToken(raw))
    await withWriteRetry(() => db.session.deleteMany({ where: { id: tokenHash(raw) } }));
}
