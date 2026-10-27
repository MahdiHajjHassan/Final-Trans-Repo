import { afterEach, expect, test } from "vitest";
import { createHash } from "node:crypto";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const { db, close } = await createTestDb(); cleanup.push(close);
  const { createAuthService } = await import("@/server/auth/service");
  let now = new Date("2026-10-27T00:00:00Z");
  return { db, auth: createAuthService(db, { now: () => now }), advanceTo(value: string) { now = new Date(value); } };
}

test("a fresh random session stores only its hash and expires exactly after seven days", async () => {
  const { db, auth, advanceTo } = await fixture();
  const user = await seedUser(db);
  const login = await auth.login({ email: user.email, password: user.password }, "client");
  expect(login.token).toMatch(/^[a-f0-9]{64}$/);
  const row = await db.session.findFirstOrThrow();
  expect(row.id).toBe(createHash("sha256").update(login.token).digest("hex"));
  expect(row.id).not.toBe(login.token);
  await expect(auth.resolveSession(login.token)).resolves.toEqual(user.actor);
  advanceTo("2026-11-02T23:59:59Z");
  await expect(auth.resolveSession(login.token)).resolves.toEqual(user.actor);
  advanceTo("2026-11-03T00:00:00Z");
  await expect(auth.resolveSession(login.token)).resolves.toBeNull();
  expect(await db.session.count()).toBe(0);
});

test("two simultaneous sessions differ and logout revokes just the selected one", async () => {
  const { db, auth } = await fixture();
  const user = await seedUser(db);
  const a = await auth.login({ email: user.email, password: user.password }, "client-a");
  const b = await auth.login({ email: user.email, password: user.password }, "client-b");
  expect(a.token).not.toBe(b.token);
  await auth.logout(a.token);
  await expect(auth.resolveSession(a.token)).resolves.toBeNull();
  await expect(auth.resolveSession(b.token)).resolves.toEqual(user.actor);
  await expect(auth.resolveSession("malformed")).resolves.toBeNull();
  await expect(auth.resolveSession(null)).resolves.toBeNull();
});

test("a role change is immediately reflected and deleting the account revokes access", async () => {
  const { db, auth } = await fixture();
  const user = await seedUser(db, { role: "ADMIN" });
  const login = await auth.login({ email: user.email, password: user.password }, "client");
  await db.user.update({ where: { id: user.actor.id }, data: { role: "MEMBER" } });
  await expect(auth.resolveSession(login.token)).resolves.toEqual({ id: user.actor.id, role: "MEMBER" });
  await db.user.delete({ where: { id: user.actor.id } });
  await expect(auth.resolveSession(login.token)).resolves.toBeNull();
});

test("password change verifies the old password and revokes every existing session", async () => {
  const { db, auth } = await fixture();
  const user = await seedUser(db);
  const a = await auth.login({ email: user.email, password: user.password }, "client-a");
  const b = await auth.login({ email: user.email, password: user.password }, "client-b");
  await expect(auth.changePassword(user.actor, { currentPassword: "wrong-password-42", newPassword: "new-password-for-tests-42" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  expect(await db.session.count()).toBe(2);
  await auth.changePassword(user.actor, { currentPassword: user.password, newPassword: "new-password-for-tests-42" });
  await expect(auth.resolveSession(a.token)).resolves.toBeNull();
  await expect(auth.resolveSession(b.token)).resolves.toBeNull();
  await expect(auth.login({ email: user.email, password: user.password }, "client-c")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  const fresh = await auth.login({ email: user.email, password: "new-password-for-tests-42" }, "client-c");
  await expect(auth.resolveSession(fresh.token)).resolves.toEqual(user.actor);
});

test("different users can establish sessions concurrently without losing either login", async () => {
  const { db, auth } = await fixture();
  const a = await seedUser(db); const b = await seedUser(db);
  const [first, second] = await Promise.all([
    auth.login({ email: a.email, password: a.password }, "client-a"),
    auth.login({ email: b.email, password: b.password }, "client-b"),
  ]);
  expect(await db.session.count()).toBe(2);
  await expect(auth.resolveSession(first.token)).resolves.toEqual(a.actor);
  await expect(auth.resolveSession(second.token)).resolves.toEqual(b.actor);
});

test("an old-password login racing a password change cannot retain access afterward", async () => {
  const { db, auth } = await fixture();
  const user = await seedUser(db);
  const [login, change] = await Promise.allSettled([
    auth.login({ email: user.email, password: user.password }, "client"),
    auth.changePassword(user.actor, { currentPassword: user.password, newPassword: "new-correct-password-42" }),
  ]);
  expect(change.status).toBe("fulfilled");
  if (login.status === "fulfilled") await expect(auth.resolveSession(login.value.token)).resolves.toBeNull();
  else expect(login.reason).toMatchObject({ code: "UNAUTHENTICATED" });
});
