import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";

function validToken(raw: string | null): raw is string { return raw !== null && /^[a-f0-9]{64}$/.test(raw); }
function tokenHash(raw: string): string { return createHash("sha256").update(raw).digest("hex"); }

export async function createSessionToken(db: Pick<Prisma.TransactionClient, "session">, userId: string, now: Date) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: tokenHash(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function resolveSessionToken(db: PrismaClient, raw: string | null, now: Date): Promise<Actor | null> {
  if (!validToken(raw)) return null;
  const session = await db.session.findUnique({ where: { id: tokenHash(raw) }, include: { user: { select: { id: true, role: true } } } });
  if (!session) return null;
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function revokeSessionToken(db: PrismaClient, raw: string | null): Promise<void> {
  if (validToken(raw)) await db.session.deleteMany({ where: { id: tokenHash(raw) } });
}
