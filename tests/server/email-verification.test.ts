import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import type { VerificationMessage } from "@/backend/modules/auth/email/verification-mail";
const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of closes.splice(0).reverse()) await close();
});
const signup = {
  email: "new@example.test",
  displayName: "New member",
  password: "correct-password-for-tests",
};
async function fixture() {
  const { db, close } = await createTestDb();
  closes.push(close);
  let time = new Date("2026-10-30T10:00:00Z");
  let fail = false;
  const sent: VerificationMessage[] = [];
  const { createVerificationService } =
    await import("@/backend/modules/auth/email/verification.service");
  const verification = createVerificationService(db, {
    now: () => time,
    send: async (message) => {
      if (fail) throw new Error("private SMTP details");
      sent.push(message);
    },
  });
  return {
    db,
    sent,
    verification,
    auth: createAuthService(db, { verification, now: () => time }),
    advance: (ms: number) => {
      time = new Date(time.getTime() + ms);
    },
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
test("unverified accounts cannot obtain password sessions or use old sessions", async () => {
  const { db, close } = await createTestDb();
  closes.push(close);
  const user = await seedUser(db, { verified: false });
  const auth = createAuthService(db);
  await expect(
    auth.login({ email: user.email, password: user.password }, "client"),
  ).rejects.toMatchObject({ code: "EMAIL_UNVERIFIED" });
  const session = await createSessionToken(db, user.actor.id, new Date());
  expect(await auth.resolveSession(session.token)).toBeNull();
});
test("signup stores a hashed pending attempt and creates a verified MEMBER only after proof", async () => {
  const f = await fixture();
  const pending = await f.verification.startSignup(
    { ...signup, email: " NEW@EXAMPLE.TEST ", displayName: " New member " },
    "client",
  );
  expect(await f.db.user.count()).toBe(0);
  expect(pending.token).toMatch(/^[a-f0-9]{64}$/);
  expect(f.sent[0]).toMatchObject({ email: "new@example.test", locale: "en" });
  expect(f.sent[0].code).toMatch(/^\d{6}$/);
  const stored = await f.db.emailChallenge.findFirstOrThrow();
  expect(stored.id).not.toBe(pending.token);
  expect(stored.codeHash).not.toBe(f.sent[0].code);
  expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  await f.verification.confirm(pending.token, f.sent[0].code, "client");
  const user = await f.db.user.findUniqueOrThrow({ where: { email: signup.email } });
  expect(user).toMatchObject({ displayName: "New member", role: "MEMBER" });
  expect(user.emailVerifiedAt).not.toBeNull();
  expect(
    (await f.auth.login({ email: signup.email, password: signup.password }, "client")).user.id,
  ).toBe(user.id);
  expect(await f.db.emailChallenge.count()).toBe(0);
});
test("a different browser and a consumed code cannot verify", async () => {
  const f = await fixture();
  const p = await f.verification.startSignup(signup, "client");
  await expect(
    f.verification.confirm("a".repeat(64), f.sent[0].code, "other"),
  ).rejects.toMatchObject({ code: "INVALID_CODE" });
  await f.verification.confirm(p.token, f.sent[0].code, "client");
  await expect(f.verification.confirm(p.token, f.sent[0].code, "client")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
});
test("five wrong guesses commit their counters and block even the correct code", async () => {
  const f = await fixture();
  const p = await f.verification.startSignup(signup, "client");
  const wrong = f.sent[0].code === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++)
    await expect(f.verification.confirm(p.token, wrong, "client")).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
  expect((await f.db.emailChallenge.findFirstOrThrow()).attempts).toBe(5);
  await expect(f.verification.confirm(p.token, f.sent[0].code, "client")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
  expect(await f.db.user.count()).toBe(0);
});
test("expired codes can be resent during the pending lifetime; old generations stay invalid", async () => {
  const f = await fixture();
  const p = await f.verification.startSignup(signup, "client");
  const old = f.sent[0].code;
  f.advance(600001);
  await expect(f.verification.confirm(p.token, old, "client")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
  await f.verification.resend(p.token, "client");
  expect(f.sent[1].generation).not.toBe(f.sent[0].generation);
  if (old !== f.sent[1].code)
    await expect(f.verification.confirm(p.token, old, "client")).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
  await f.verification.confirm(p.token, f.sent[1].code, "client");
});
test("address cooldown applies across new browser attempts and resend", async () => {
  const f = await fixture();
  const p = await f.verification.startSignup(signup, "client");
  await expect(f.verification.resend(p.token, "client")).rejects.toMatchObject({
    code: "RATE_LIMITED",
  });
  await expect(f.verification.startSignup(signup, "another-client")).rejects.toMatchObject({
    code: "RATE_LIMITED",
  });
  expect(f.sent).toHaveLength(1);
});
test("hourly send quotas cannot be reset by starting new attempts", async () => {
  const f = await fixture();
  for (let i = 0; i < 5; i++) {
    await f.verification.startSignup(signup, `client-${i}`);
    f.advance(61000);
  }
  await expect(f.verification.startSignup(signup, "sixth-client")).rejects.toMatchObject({
    code: "RATE_LIMITED",
  });
  expect(f.sent).toHaveLength(5);
});
test("failed delivery stays unusable and can recover through explicit resend", async () => {
  const f = await fixture();
  f.fail(true);
  const p = await f.verification.startSignup(signup, "client");
  expect((await f.verification.read(p.token)).status).toBe("FAILED");
  await expect(f.verification.confirm(p.token, "123456", "client")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
  expect(await f.db.user.count()).toBe(0);
  f.advance(61000);
  f.fail(false);
  await f.verification.resend(p.token, "client");
  await f.verification.confirm(p.token, f.sent[0].code, "client");
});
test("concurrent confirmation creates one account and consumes the challenge once", async () => {
  const f = await fixture();
  const p = await f.verification.startSignup(signup, "client");
  const result = await Promise.allSettled([
    f.verification.confirm(p.token, f.sent[0].code, "client"),
    f.verification.confirm(p.token, f.sent[0].code, "client"),
  ]);
  expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(await f.db.user.count()).toBe(1);
});
test("legacy verification requires the password, preserves identity, and revokes all old sessions", async () => {
  const f = await fixture();
  const user = await seedUser(f.db, { verified: false });
  const old = await createSessionToken(f.db, user.actor.id, new Date("2026-10-30T10:00:00Z"));
  await expect(
    f.verification.startExisting({ email: user.email, password: "wrong-password-42" }, "client"),
  ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  const p = await f.verification.startExisting(
    { email: user.email, password: user.password },
    "client",
  );
  await f.verification.confirm(p.token, f.sent[0].code, "client");
  expect(
    (await f.db.user.findUniqueOrThrow({ where: { id: user.actor.id } })).emailVerifiedAt,
  ).not.toBeNull();
  expect(await f.auth.resolveSession(old.token)).toBeNull();
  expect(await f.db.session.count()).toBe(0);
});
test("a changed legacy password invalidates its outstanding email challenge", async () => {
  const f = await fixture();
  const user = await seedUser(f.db, { verified: false });
  const p = await f.verification.startExisting(
    { email: user.email, password: user.password },
    "client",
  );
  await f.db.user.update({ where: { id: user.actor.id }, data: { passwordHash: "changed-hash" } });
  await expect(f.verification.confirm(p.token, f.sent[0].code, "client")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
});
test("new signup cannot overwrite an existing account or attach its password to that account", async () => {
  const f = await fixture();
  const user = await seedUser(f.db, { email: signup.email });
  await expect(f.verification.startSignup(signup, "client")).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect(await f.db.user.count()).toBe(1);
  expect(
    (await f.auth.login({ email: user.email, password: user.password }, "client")).user.id,
  ).toBe(user.actor.id);
});
