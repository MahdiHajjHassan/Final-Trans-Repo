import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createVerificationService } from "@/backend/modules/auth/email/verification.service";
import type { VerificationMessage } from "@/backend/modules/auth/email/verification-mail";
import { createUserService } from "@/backend/modules/users/users.service";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createAuthHandlers } from "@/backend/modules/auth/auth.controller";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { verificationCookieName } from "@/backend/modules/auth/email/verification-cookie";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of closes.splice(0).reverse()) await close();
});
const input = {
  email: "pending-administrator@example.test",
  displayName: "Pending administrator",
  password: "correct-password-for-tests",
};
async function fixture() {
  const { db, close } = await createTestDb();
  closes.push(close);
  const admin = await seedUser(db, { role: "ADMIN" });
  let time = new Date("2026-10-30T12:00:00Z");
  let fail = false;
  const sent: VerificationMessage[] = [];
  const verification = createVerificationService(db, {
    now: () => time,
    send: async (message) => {
      if (fail) throw new Error("private SMTP failure");
      sent.push(message);
    },
  });
  return {
    db,
    admin,
    sent,
    verification,
    users: createUserService(db, { verification }),
    auth: createAuthService(db, { verification, now: () => time }),
    now: () => time,
    advance: (ms: number) => {
      time = new Date(time.getTime() + ms);
    },
    fail: (value: boolean) => {
      fail = value;
    },
  };
}

test.each(["MEMBER", "ADMIN"] as const)(
  "admin creation keeps a %s out of User until correct mailbox proof",
  async (role) => {
    const f = await fixture();
    const pending = await f.users.createUser(f.admin.actor, { ...input, role });
    expect(
      await f.db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    ).toBeNull();
    expect(pending.token).toMatch(/^[a-f0-9]{64}$/);
    const stored = await f.db.emailChallenge.findFirstOrThrow();
    expect(stored.passwordHash).not.toBe(input.password);
    expect(stored.codeHash).not.toBe(f.sent[0].code);
    const wrong = f.sent[0].code === "000000" ? "111111" : "000000";
    await expect(
      f.verification.confirm(pending.token, wrong, "client", f.admin.actor),
    ).rejects.toMatchObject({ code: "INVALID_CODE" });
    expect(await f.db.user.count()).toBe(1);
    await f.verification.confirm(pending.token, f.sent[0].code, "client", f.admin.actor);
    const user = await f.db.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user).toMatchObject({ role, displayName: input.displayName });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(
      (await f.auth.login({ email: input.email, password: input.password }, "login")).user.id,
    ).toBe(user.id);
    await expect(
      f.verification.confirm(pending.token, f.sent[0].code, "client", f.admin.actor),
    ).rejects.toMatchObject({ code: "INVALID_CODE" });
    expect(await f.db.user.count()).toBe(2);
  },
);

test("failed delivery and an expired admin code cannot create a user; explicit resend can recover", async () => {
  const f = await fixture();
  f.fail(true);
  const pending = await f.users.createUser(f.admin.actor, { ...input, role: "ADMIN" });
  expect(await f.db.user.count()).toBe(1);
  expect((await f.verification.read(pending.token)).status).toBe("FAILED");
  f.advance(600001);
  await expect(
    f.verification.confirm(pending.token, "123456", "client", f.admin.actor),
  ).rejects.toMatchObject({ code: "INVALID_CODE" });
  f.fail(false);
  await f.verification.resend(pending.token, "client", f.admin.actor);
  expect(await f.db.user.count()).toBe(1);
  await f.verification.confirm(pending.token, f.sent[0].code, "client", f.admin.actor);
  expect((await f.db.user.findUniqueOrThrow({ where: { email: input.email } })).role).toBe("ADMIN");
});

test("admin activation requires the same still-privileged administrator, not just a code", async () => {
  const f = await fixture();
  const other = await seedUser(f.db, { role: "ADMIN" });
  const pending = await f.users.createUser(f.admin.actor, { ...input, role: "ADMIN" });
  await expect(
    f.verification.confirm(pending.token, f.sent[0].code, "client"),
  ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(
    f.verification.confirm(pending.token, f.sent[0].code, "client", other.actor),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await f.db.user.update({ where: { id: f.admin.actor.id }, data: { role: "MEMBER" } });
  await expect(
    f.verification.confirm(pending.token, f.sent[0].code, "client", f.admin.actor),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await f.db.user.findUnique({ where: { email: input.email } })).toBeNull();
});

test("deleting the initiating administrator invalidates its pending creation", async () => {
  const f = await fixture();
  const pending = await f.users.createUser(f.admin.actor, { ...input, role: "ADMIN" });
  await f.db.user.delete({ where: { id: f.admin.actor.id } });
  expect(await f.db.emailChallenge.count()).toBe(0);
  await expect(
    f.verification.confirm(pending.token, f.sent[0].code, "client", f.admin.actor),
  ).rejects.toMatchObject({ code: "INVALID_CODE" });
  expect(await f.db.user.count()).toBe(0);
});

test("missing different and demoted creators cannot resend or rotate an admin code", async () => {
  const f = await fixture();
  const other = await seedUser(f.db, { role: "ADMIN" });
  const pending = await f.users.createUser(f.admin.actor, { ...input, role: "ADMIN" });
  f.advance(60001);
  const before = await f.db.emailChallenge.findFirstOrThrow();
  await expect(f.verification.resend(pending.token, "client")).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
  await expect(f.verification.resend(pending.token, "client", other.actor)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await f.db.user.update({ where: { id: f.admin.actor.id }, data: { role: "MEMBER" } });
  await expect(f.verification.resend(pending.token, "client", f.admin.actor)).rejects.toMatchObject(
    { code: "FORBIDDEN" },
  );
  expect(f.sent).toHaveLength(1);
  expect((await f.db.emailChallenge.findFirstOrThrow()).generation).toBe(before.generation);
  expect(
    await f.db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
  ).toBeNull();
});

test("public signup cannot choose an admin role even when the confirming browser is an admin", async () => {
  const f = await fixture();
  await expect(
    f.verification.startSignup({ ...input, role: "ADMIN" }, "public"),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const pending = await f.verification.startSignup(input, "public");
  await f.verification.confirm(pending.token, f.sent[0].code, "public", f.admin.actor);
  expect((await f.db.user.findUniqueOrThrow({ where: { email: input.email } })).role).toBe(
    "MEMBER",
  );
});

test("HTTP confirmation uses the current admin session and does not create a new-user session", async () => {
  const f = await fixture();
  const pending = await f.users.createUser(f.admin.actor, { ...input, role: "ADMIN" });
  const session = await createSessionToken(f.db, f.admin.actor.id, f.now());
  const handlers = createAuthHandlers(f.auth, { appOrigin: "https://localhost" });
  const response = await handlers.verificationConfirm(
    new Request("https://localhost/api/auth/verification/confirm", {
      method: "POST",
      headers: {
        Origin: "https://localhost",
        "Content-Type": "application/json",
        Cookie: `${verificationCookieName}=${pending.token}; ${sessionCookieName}=${session.token}`,
      },
      body: JSON.stringify({ code: f.sent[0].code }),
    }),
  );
  expect(response.status).toBe(200);
  const created = await f.db.user.findUniqueOrThrow({ where: { email: input.email } });
  expect(created.role).toBe("ADMIN");
  expect(await f.db.session.count({ where: { userId: created.id } })).toBe(0);
  expect((await f.auth.resolveSession(session.token))?.id).toBe(f.admin.actor.id);
});
