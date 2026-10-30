import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { Prisma, type EmailChallenge, type PrismaClient } from "@/generated/prisma/client";
import type { Locale } from "@/shared/i18n/config";
import type { Actor, Role } from "@/shared/auth";
import { DomainError } from "../../../common/errors";
import { parseInput } from "../../../common/validation";
import { createRateLimiter } from "../../../common/security/rate-limit";
import { withWriteRetry } from "../../../database/write-retry";
import { adminCreateSchema, loginSchema, registerSchema } from "../dto/auth.schema";
import { hashPassword, verifyPassword } from "../password";
import { currentActor } from "../session.guard";
import type { VerificationSender } from "./verification-mail";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const verifier = (token: string, generation: string, code: string) =>
  createHmac("sha256", token).update(`${generation}:${code}`).digest("hex");
const codeSchema = z.string().regex(/^\d{6}$/);
const validToken = (raw: string | null): raw is string =>
  raw !== null && /^[a-f0-9]{64}$/.test(raw);
let dummy: Promise<string> | undefined;

// Owns pending attempts, SMTP submission, persistent quotas and single-use account activation.
export function createVerificationService(
  db: PrismaClient,
  options: { send: VerificationSender; now?: () => Date },
) {
  const now = options.now ?? (() => new Date());
  const quota = createRateLimiter(db, now);
  async function limit(scope: string, key: string, count: number, seconds: number) {
    const result = await quota(scope, key, count, seconds);
    if (!result.allowed) throw new DomainError("RATE_LIMITED", undefined, result.retryAfterSeconds);
  }
  async function sendLimits(client: string) {
    await limit("verification-send-client", client, 10, 900);
  }
  // Reserve a full minute atomically, including new attempts from another browser/process.
  async function reserveSend(tx: Prisma.TransactionClient, email: string) {
    const time = now().getTime();
    const key = digest(`verification-send-cooldown\0${email}`);
    const accepted = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
      VALUES (${key}, ${new Date(time).toISOString()}, 1)
      ON CONFLICT("key") DO UPDATE SET "windowStart" = excluded."windowStart", "count" = 1
      WHERE "RateLimitBucket"."windowStart" <= ${new Date(time - 60000).toISOString()}
      RETURNING "count"
    `);
    if (accepted.length === 0) {
      const previous = await tx.rateLimitBucket.findUniqueOrThrow({ where: { key } });
      throw new DomainError(
        "RATE_LIMITED",
        undefined,
        Math.max(1, Math.ceil((previous.windowStart.getTime() + 60000 - time) / 1000)),
      );
    }
    const hourly = await createRateLimiter(tx, now)("verification-send-hour", email, 5, 3600);
    if (!hourly.allowed) throw new DomainError("RATE_LIMITED", undefined, hourly.retryAfterSeconds);
  }
  async function pending(raw: string | null) {
    if (!validToken(raw)) throw new DomainError("INVALID_CODE");
    const record = await db.emailChallenge.findUnique({ where: { id: digest(raw) } });
    if (!record || record.pendingUntil <= now()) throw new DomainError("INVALID_CODE");
    return record;
  }
  // An administrator's pending account remains bound to that current administrator.
  async function requireCreator(
    tx: Prisma.TransactionClient,
    record: Pick<EmailChallenge, "createdById">,
    actor?: Actor | null,
  ) {
    if (!record.createdById) return;
    if (!actor) throw new DomainError("UNAUTHENTICATED");
    if (actor.id !== record.createdById) throw new DomainError("FORBIDDEN");
    if ((await currentActor(tx, actor)).role !== "ADMIN") throw new DomainError("FORBIDDEN");
  }
  // Activation is conditional on this exact generation; stale SMTP completions cannot revive it.
  async function deliver(record: EmailChallenge, raw: string, code: string) {
    let status = "SENT";
    try {
      await options.send({
        email: record.email,
        code,
        locale: record.locale as Locale,
        generation: record.generation,
      });
    } catch {
      status = "FAILED";
    }
    await withWriteRetry(() =>
      db.emailChallenge.updateMany({
        where: { id: record.id, generation: record.generation, status: "PENDING" },
        data: { status },
      }),
    );
    return { token: raw, expiresAt: record.pendingUntil };
  }
  function generation(raw: string, pendingUntil: Date, previous?: EmailChallenge) {
    const generation = randomUUID();
    let code: string;
    do {
      code = randomInt(1000000).toString().padStart(6, "0");
    } while (previous && verifier(raw, previous.generation, code) === previous.codeHash);
    const time = now().getTime();
    return {
      code,
      data: {
        generation,
        codeHash: verifier(raw, generation, code),
        status: "PENDING",
        attempts: 0,
        expiresAt: new Date(Math.min(time + 600000, pendingUntil.getTime())),
        resendAt: new Date(time + 60000),
      },
    };
  }
  async function start(
    input: {
      email: string;
      displayName: string;
      passwordHash: string;
      locale: Locale;
      userId?: string;
      createdById?: string;
      requestedRole?: Role;
    },
    client: string,
  ) {
    await sendLimits(client);
    const raw = randomBytes(32).toString("hex");
    const pendingUntil = new Date(now().getTime() + 3600000);
    const next = generation(raw, pendingUntil);
    const record = await withWriteRetry(() =>
      db.$transaction(async (tx) => {
        if (input.createdById) {
          await requireCreator(
            tx,
            { createdById: input.createdById },
            {
              id: input.createdById,
              role: "ADMIN",
            },
          );
          if (await tx.user.findUnique({ where: { email: input.email } }))
            throw new DomainError("CONFLICT", { email: ["unavailable"] });
        }
        await reserveSend(tx, input.email);
        await tx.emailChallenge.deleteMany({ where: { pendingUntil: { lte: now() } } });
        return tx.emailChallenge.create({
          data: { ...input, ...next.data, id: digest(raw), pendingUntil },
        });
      }),
    );
    return deliver(record, raw, next.code);
  }
  return {
    async startAdmin(actor: Actor | null, input: unknown, client = "internal") {
      const data = parseInput(adminCreateSchema, input);
      const creator = await currentActor(db, actor);
      if (creator.role !== "ADMIN") throw new DomainError("FORBIDDEN");
      await limit("admin-create", creator.id, 10, 60);
      if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } }))
        throw new DomainError("CONFLICT", { email: ["unavailable"] });
      return start(
        {
          email: data.email,
          displayName: data.displayName,
          passwordHash: await hashPassword(data.password),
          locale: data.locale,
          createdById: creator.id,
          requestedRole: data.role,
        },
        client,
      );
    },
    async startSignup(input: unknown, client = "internal") {
      const data = parseInput(registerSchema, input);
      await limit("register-client", client, 5, 900);
      if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } }))
        throw new DomainError("CONFLICT", { email: ["unavailable"] });
      return start(
        {
          email: data.email,
          displayName: data.displayName,
          passwordHash: await hashPassword(data.password),
          locale: data.locale,
        },
        client,
      );
    },
    async startExisting(input: unknown, client: string) {
      const data = parseInput(loginSchema, input);
      await limit("verification-password-client", client, 10, 900);
      const user = await db.user.findUnique({ where: { email: data.email } });
      dummy ??= hashPassword(randomBytes(32).toString("hex"));
      const valid = await verifyPassword(user?.passwordHash ?? (await dummy), data.password);
      if (!user || !valid) throw new DomainError("UNAUTHENTICATED");
      if (user.emailVerifiedAt) throw new DomainError("CONFLICT");
      return start(
        {
          email: user.email,
          displayName: user.displayName,
          passwordHash: digest(user.passwordHash),
          locale: data.locale,
          userId: user.id,
        },
        client,
      );
    },
    async read(raw: string | null) {
      const record = await pending(raw);
      return {
        email: record.email,
        ...(record.createdById ? { adminCreation: true } : {}),
        serverNow: now().toISOString(),
        expiresAt: record.expiresAt.toISOString(),
        resendAt: record.resendAt.toISOString(),
        status: record.status as "PENDING" | "SENT" | "FAILED",
      };
    },
    async resend(raw: string | null, client: string, actor?: Actor | null) {
      const record = await pending(raw);
      await sendLimits(client);
      const next = generation(raw!, record.pendingUntil, record);
      const changed = await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          await requireCreator(tx, record, actor);
          await reserveSend(tx, record.email);
          const updated = await tx.emailChallenge.updateMany({
            where: { id: record.id, generation: record.generation, pendingUntil: { gt: now() } },
            data: next.data,
          });
          if (updated.count !== 1) throw new DomainError("INVALID_CODE");
          return updated;
        }),
      );
      if (changed.count !== 1) throw new DomainError("INVALID_CODE");
      return deliver({ ...record, ...next.data }, raw!, next.code);
    },
    async confirm(raw: string | null, input: unknown, client: string, actor?: Actor | null) {
      const code = parseInput(codeSchema, input);
      await limit("verification-guess-client", client, 30, 60);
      if (!validToken(raw)) throw new DomainError("INVALID_CODE");
      const result = await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const record = await tx.emailChallenge.findUnique({ where: { id: digest(raw) } });
          if (
            !record ||
            record.pendingUntil <= now() ||
            record.expiresAt <= now() ||
            record.status !== "SENT" ||
            record.attempts >= 5
          )
            return false;
          await requireCreator(tx, record, actor);
          const expected = Buffer.from(record.codeHash, "hex");
          const actual = Buffer.from(verifier(raw, record.generation, code), "hex");
          if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
            await tx.emailChallenge.update({
              where: { id: record.id },
              data: { attempts: { increment: 1 } },
            });
            return false;
          }
          if (record.userId) {
            const user = await tx.user.findUnique({ where: { id: record.userId } });
            if (
              !user ||
              user.email !== record.email ||
              digest(user.passwordHash) !== record.passwordHash ||
              user.emailVerifiedAt
            )
              return false;
            await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now() } });
            await tx.session.deleteMany({ where: { userId: user.id } });
          } else {
            if (await tx.user.findUnique({ where: { email: record.email } })) return false;
            await tx.user.create({
              data: {
                email: record.email,
                displayName: record.displayName,
                passwordHash: record.passwordHash,
                role: record.createdById ? record.requestedRole : "MEMBER",
                emailVerifiedAt: now(),
              },
            });
          }
          await tx.emailChallenge.deleteMany({ where: { email: record.email } });
          return true;
        }),
      );
      if (!result) throw new DomainError("INVALID_CODE");
      return { verified: true };
    },
  };
}
export type VerificationService = ReturnType<typeof createVerificationService>;
