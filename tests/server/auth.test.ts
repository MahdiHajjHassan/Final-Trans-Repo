import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const { db, close } = await createTestDb(); cleanup.push(close);
  const { createAuthService } = await import("@/server/auth/service");
  return { db, auth: createAuthService(db) };
}
const input = { email: " MEMBER@EXAMPLE.TEST ", displayName: " Member One ", password: "correct-password-for-tests" };

test("registration normalizes email, trims display name, creates only MEMBER, and returns no password hash", async () => {
  const { db, auth } = await fixture();
  const user = await auth.register(input);
  expect(user).toMatchObject({ email: "member@example.test", displayName: "Member One", role: "MEMBER" });
  expect(user).not.toHaveProperty("passwordHash");
  const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  expect(stored.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  expect(stored.passwordHash).not.toContain(input.password);
});

test("registration rejects client-supplied role and case-equivalent duplicate emails", async () => {
  const { db, auth } = await fixture();
  await expect(auth.register({ ...input, role: "ADMIN" })).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.user.count()).toBe(0);
  await auth.register(input);
  await expect(auth.register({ ...input, email: "member@example.test" })).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.user.count()).toBe(1);
});

test.each([
  { ...input, email: "not-an-email" }, { ...input, displayName: "  " },
  { ...input, displayName: "x".repeat(61) }, { ...input, password: "x".repeat(11) },
  { ...input, password: "x".repeat(129) },
])("invalid registration leaves the database unchanged", async (invalid) => {
  const { db, auth } = await fixture();
  await expect(auth.register(invalid)).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.user.count()).toBe(0);
});

test("login uses one generic failure for missing users, wrong passwords, and corrupt stored hashes", async () => {
  const { db, auth } = await fixture();
  await seedUser(db, { email: "known@example.test", password: input.password });
  await expect(auth.login({ email: "unknown@example.test", password: input.password }, "client-a")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(auth.login({ email: "known@example.test", password: "wrong-password-42" }, "client-a")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await db.user.updateMany({ data: { passwordHash: "corrupt-hash" } });
  await expect(auth.login({ email: "known@example.test", password: input.password }, "client-a")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});

test("members can change only their own display name", async () => {
  const { db, auth } = await fixture();
  const a = await seedUser(db, { email: "a@example.test" });
  const b = await seedUser(db, { email: "b@example.test" });
  const changed = await auth.updateAccount(a.actor, { displayName: " Updated " });
  expect(changed.displayName).toBe("Updated");
  await expect(auth.updateAccount(a.actor, { displayName: "Changed", id: b.actor.id })).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(auth.updateAccount(a.actor, { role: "ADMIN" })).rejects.toMatchObject({ code: "VALIDATION" });
  expect((await db.user.findUniqueOrThrow({ where: { id: b.actor.id } })).displayName).toBe("Test member");
});
