import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient, type User } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { AccountDTO } from "@/shared/auth";
import { DomainError } from "../errors";
import { parseInput } from "../validation";
import { createRateLimiter } from "../security/rate-limit";
import { accountSchema, loginSchema, passwordChangeSchema, registerSchema } from "./schema";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, resolveSessionToken, revokeSessionToken } from "./session";
import { currentActor } from "./policy";
import { withWriteRetry } from "../db-write";

const accountSelect = { id: true, email: true, displayName: true, role: true, createdAt: true } satisfies Prisma.UserSelect;
type AccountRecord = Pick<User, "id" | "email" | "displayName" | "role" | "createdAt">;
function dto(user: AccountRecord): AccountDTO { return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt.toISOString() }; }
let dummyHash: Promise<string> | undefined;

export function createAuthService(db: PrismaClient, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  const consume = createRateLimiter(db, now);
  async function limit(scope: string, key: string, allowance: number) {
    const result = await consume(scope, key, allowance, 15 * 60);
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
  }
  return {
    async register(input: unknown, clientKey = "internal"): Promise<AccountDTO> {
      const data = parseInput(registerSchema, input);
      await limit("register-client", clientKey, 5);
      const passwordHash = await hashPassword(data.password);
      try {
        return await withWriteRetry(() => db.$transaction(async (tx) => {
          const user = await tx.user.create({ data: { email: data.email, displayName: data.displayName, passwordHash, role: "MEMBER" }, select: accountSelect });
          return dto(user);
        }));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new DomainError("CONFLICT", { email: ["unavailable"] });
        throw error;
      }
    },
    async login(input: unknown, clientKey: string) {
      const data = parseInput(loginSchema, input);
      await limit("login-client", clientKey, 10);
      await limit("login-email-client", `${clientKey}\0${data.email}`, 5);
      const user = await db.user.findUnique({ where: { email: data.email } });
      dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
      const valid = await verifyPassword(user?.passwordHash ?? await dummyHash, data.password);
      if (!user || !valid) throw new DomainError("UNAUTHENTICATED");
      return withWriteRetry(() => db.$transaction(async (tx) => {
        const current = await tx.user.findUnique({ where: { id: user.id } });
        if (!current || current.passwordHash !== user.passwordHash) throw new DomainError("UNAUTHENTICATED");
        const session = await createSessionToken(tx, current.id, now());
        return { user: dto(current), ...session };
      }));
    },
    resolveSession(raw: string | null) { return resolveSessionToken(db, raw, now()); },
    logout(raw: string | null) { return revokeSessionToken(db, raw); },
    async account(actor: Actor): Promise<AccountDTO> {
      const user = await db.user.findUnique({ where: { id: actor.id }, select: accountSelect });
      if (!user) throw new DomainError("UNAUTHENTICATED");
      return dto(user);
    },
    async updateAccount(actor: Actor, input: unknown): Promise<AccountDTO> {
      const data = parseInput(accountSchema, input);
      return withWriteRetry(() => db.$transaction(async (tx) => {
        const current = await currentActor(tx, actor);
        const user = await tx.user.update({ where: { id: current.id }, data, select: accountSelect });
        return dto(user);
      }));
    },
    async changePassword(actor: Actor, input: unknown): Promise<void> {
      const data = parseInput(passwordChangeSchema, input);
      await limit("password-change-user", actor.id, 5);
      const user = await db.user.findUnique({ where: { id: actor.id } });
      if (!user || !await verifyPassword(user.passwordHash, data.currentPassword)) throw new DomainError("UNAUTHENTICATED");
      const passwordHash = await hashPassword(data.newPassword);
      await withWriteRetry(() => db.$transaction(async (tx) => {
        const result = await tx.user.updateMany({ where: { id: actor.id, passwordHash: user.passwordHash }, data: { passwordHash } });
        if (result.count !== 1) throw new DomainError("CONFLICT");
        await tx.session.deleteMany({ where: { userId: actor.id } });
      }));
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
