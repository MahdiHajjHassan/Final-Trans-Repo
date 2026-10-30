import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
test("operator email correction preserves role/password/games, revokes sessions, and requires proof again", async () => {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const user = await seedUser(db, { role: "ADMIN", email: "admin@tictactoe.local" });
  const before = await db.user.findUniqueOrThrow({ where: { id: user.actor.id } });
  const game = await db.game.create({ data: { mode: "AI", xId: user.actor.id, status: "ACTIVE" } });
  await createSessionToken(db, user.actor.id, new Date());
  const { setAccountEmail } = await import("@/backend/modules/auth/email/change-email");
  await setAccountEmail(db, " ADMIN@TICTACTOE.LOCAL ", " owner@example.test ");
  const after = await db.user.findUniqueOrThrow({ where: { id: user.actor.id } });
  expect(after).toMatchObject({
    id: before.id,
    role: "ADMIN",
    passwordHash: before.passwordHash,
    email: "owner@example.test",
    emailVerifiedAt: null,
  });
  expect(await db.session.count()).toBe(0);
  expect((await db.game.findUniqueOrThrow({ where: { id: game.id } })).xId).toBe(user.actor.id);
});
test("operator correction refuses another account's email without partial writes", async () => {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const user = await seedUser(db, { email: "one@example.test" });
  await seedUser(db, { email: "two@example.test" });
  const { setAccountEmail } = await import("@/backend/modules/auth/email/change-email");
  await expect(setAccountEmail(db, "one@example.test", "two@example.test")).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect((await db.user.findUniqueOrThrow({ where: { id: user.actor.id } })).email).toBe(
    "one@example.test",
  );
});

test("an actor resolved before email correction cannot change the password after ownership is cleared", async () => {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const user = await seedUser(db, { email: "before@example.test" });
  const { createAuthService } = await import("@/backend/modules/auth/auth.service");
  const { setAccountEmail } = await import("@/backend/modules/auth/email/change-email");
  const auth = createAuthService(db);
  const session = await auth.login({ email: user.email, password: user.password }, "race");
  const actor = await auth.resolveSession(session.token);
  if (!actor) throw new Error("Expected a verified actor before correction");
  const before = await db.user.findUniqueOrThrow({ where: { id: user.actor.id } });
  await setAccountEmail(db, user.email, "after@example.test");

  await expect(
    auth.changePassword(actor, {
      currentPassword: user.password,
      newPassword: "replacement-test-password-42",
    }),
  ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  expect((await db.user.findUniqueOrThrow({ where: { id: actor.id } })).passwordHash).toBe(
    before.passwordHash,
  );
  expect(await auth.resolveSession(session.token)).toBeNull();
});

test("operator correction clears both addresses' pending proof without clearing unrelated attempts", async () => {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const user = await seedUser(db, { email: "old@example.test", verified: false });
  const { createVerificationService } =
    await import("@/backend/modules/auth/email/verification.service");
  const verification = createVerificationService(db, { send: async () => {} });
  await verification.startExisting({ email: user.email, password: user.password }, "legacy");
  await verification.startSignup(
    { email: "new@example.test", displayName: "New address", password: user.password },
    "new",
  );
  await verification.startSignup(
    { email: "other@example.test", displayName: "Other", password: user.password },
    "other",
  );
  const { setAccountEmail } = await import("@/backend/modules/auth/email/change-email");
  await setAccountEmail(db, user.email, "new@example.test");
  expect(await db.emailChallenge.findMany({ select: { email: true } })).toEqual([
    { email: "other@example.test" },
  ]);
});
