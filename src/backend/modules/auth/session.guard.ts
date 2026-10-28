import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { AuthService } from "./auth.service";
import { DomainError } from "../../common/errors";

export const sessionCookieName = "__Host-taskboard_session";

// Reads the session cookie. Duplicate cookies are rejected rather than picking one.
export function readSessionToken(request: Request): string | null {
  const matches = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${sessionCookieName}=`));
  return matches.length === 1 ? matches[0].slice(sessionCookieName.length + 1) : null;
}

// The guard for API calls: an invalid session stops the request with a 401.
export async function requestActor(request: Request, auth: AuthService): Promise<Actor> {
  const actor = await auth.resolveSession(readSessionToken(request));
  if (!actor) throw new DomainError("UNAUTHENTICATED");
  return actor;
}

// Loads the user again inside the operation, so deletion or a role change takes effect.
export async function currentActor(
  tx: Prisma.TransactionClient,
  supplied: Actor | null,
): Promise<Actor> {
  if (!supplied) throw new DomainError("UNAUTHENTICATED");
  const actor = await tx.user.findUnique({
    where: { id: supplied.id },
    select: { id: true, role: true },
  });
  if (!actor) throw new DomainError("UNAUTHENTICATED");
  return actor;
}
