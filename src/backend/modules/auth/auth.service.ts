import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient, type User } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { AccountDTO } from "@/shared/auth";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import { createRateLimiter } from "../../common/security/rate-limit";
import { accountSchema, loginSchema, passwordChangeSchema } from "./dto/auth.schema";
import { hashPassword, verifyPassword } from "./password";
import { createVerificationService, type VerificationService } from "./email/verification.service";
import { createVerificationSender } from "./email/verification-mail";
import { createSessionToken, resolveSessionToken, revokeSessionToken } from "./sessions.service";
import { currentActor } from "./session.guard";
import { withWriteRetry } from "../../database/write-retry";

// Only account fields we can send back. Password hashes stay in the database.
const accountSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
type AccountRecord = Pick<User, "id" | "email" | "displayName" | "role" | "createdAt">;

// Turns a database account into JSON, including an ISO date the browser can read.
function dto(user: AccountRecord): AccountDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
let dummyHash: Promise<string> | undefined;

// The account rules: registration, login, profile changes and password changes.
// The controller handles HTTP; these functions work with the database.
export function createAuthService(
  db: PrismaClient,
  options: { now?: () => Date; verification?: VerificationService } = {},
) {
  const now = options.now ?? (() => new Date());
  const consume = createRateLimiter(db, now);
  const verification =
    options.verification ??
    createVerificationService(db, { now, send: createVerificationSender(undefined) });

  // Charges this action to its quota before doing the expensive work.
  async function limit(scope: string, key: string, allowance: number) {
    const result = await consume(scope, key, allowance, 15 * 60);
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
  }
  return {
    verification,
    // Signup remains pending until the browser proves ownership with its emailed code.
    register(input: unknown, clientKey = "internal") {
      return verification.startSignup(input, clientKey);
    },

    // Checks the password and creates a session. The controller puts its token in the cookie.
    async login(input: unknown, clientKey: string) {
      // 1. Limit attempts by client, then by the email/client pair.
      const data = parseInput(loginSchema, input);
      await limit("login-client", clientKey, 10);
      await limit("login-email-client", `${clientKey}\0${data.email}`, 5);
      const user = await db.user.findUnique({ where: { email: data.email } });

      // 2. Still check a hash when the email is missing, avoiding a fast rejection path.
      dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
      const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), data.password);
      if (!user || !valid) throw new DomainError("UNAUTHENTICATED");
      if (!user.emailVerifiedAt) throw new DomainError("EMAIL_UNVERIFIED");
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          // 3. Recheck inside the transaction: the password may have changed in the meantime.
          const current = await tx.user.findUnique({ where: { id: user.id } });
          if (!current || current.passwordHash !== user.passwordHash || !current.emailVerifiedAt)
            throw new DomainError("UNAUTHENTICATED");
          const session = await createSessionToken(tx, current.id, now());
          return { user: dto(current), ...session };
        }),
      );
    },

    // Who is behind this token? Returns null for a missing, expired or unknown session.
    resolveSession(raw: string | null) {
      return resolveSessionToken(db, raw, now());
    },

    // Revokes this one session. Logging out with no valid token is harmless.
    logout(raw: string | null) {
      return revokeSessionToken(db, raw);
    },

    // The signed-in user's own account, including their private email address.
    async account(actor: Actor): Promise<AccountDTO> {
      const user = await db.user.findUnique({ where: { id: actor.id }, select: accountSelect });
      if (!user) throw new DomainError("UNAUTHENTICATED");
      return dto(user);
    },

    // Changes the caller's display name. Email and role cannot be changed here.
    async updateAccount(actor: Actor, input: unknown): Promise<AccountDTO> {
      const data = parseInput(accountSchema, input);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const current = await currentActor(tx, actor);
          const user = await tx.user.update({
            where: { id: current.id },
            data,
            select: accountSelect,
          });
          return dto(user);
        }),
      );
    },

    // Checks the old password, saves the new hash and signs out every session.
    async changePassword(actor: Actor, input: unknown): Promise<void> {
      const data = parseInput(passwordChangeSchema, input);
      await limit("password-change-user", actor.id, 5);
      const user = await db.user.findUnique({ where: { id: actor.id } });
      if (!user || !(await verifyPassword(user.passwordHash, data.currentPassword)))
        throw new DomainError("UNAUTHENTICATED");
      const passwordHash = await hashPassword(data.newPassword);
      await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          await currentActor(tx, actor);
          const result = await tx.user.updateMany({
            where: { id: actor.id, passwordHash: user.passwordHash },
            data: { passwordHash },
          });
          if (result.count !== 1) throw new DomainError("CONFLICT");

          // A password change signs out every browser session.
          await tx.session.deleteMany({ where: { userId: actor.id } });
        }),
      );
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
