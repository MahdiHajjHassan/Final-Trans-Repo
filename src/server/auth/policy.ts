import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { AuthService } from "./service";
import { DomainError } from "../errors";

export const sessionCookieName = "__Host-taskboard_session";
export function readSessionToken(request: Request): string | null {
  const matches = (request.headers.get("Cookie") ?? "").split(";").map((item) => item.trim()).filter((item) => item.startsWith(`${sessionCookieName}=`));
  return matches.length === 1 ? matches[0].slice(sessionCookieName.length + 1) : null;
}
export async function requestActor(request: Request, auth: AuthService): Promise<Actor> {
  const actor = await auth.resolveSession(readSessionToken(request));
  if (!actor) throw new DomainError("UNAUTHENTICATED");
  return actor;
}
export async function currentActor(tx: Prisma.TransactionClient, supplied: Actor | null): Promise<Actor> {
  if (!supplied) throw new DomainError("UNAUTHENTICATED");
  const actor = await tx.user.findUnique({ where: { id: supplied.id }, select: { id: true, role: true } });
  if (!actor) throw new DomainError("UNAUTHENTICATED");
  return actor;
}
