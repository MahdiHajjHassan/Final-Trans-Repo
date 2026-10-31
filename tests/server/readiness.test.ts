import { afterEach, expect, test } from "vitest";
import { verify } from "@node-rs/argon2";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function fixture(migrate = true) {
  const value = await createTestDb({ migrate });
  cleanup.push(value.close);
  return value;
}
const seedInput = {
  adminEmail: "admin@taskboard.local",
  adminPassword: "local-seed-password-42",
  apiActorEmail: "api@taskboard.local",
};

test("readiness fails when the database exists without its migrations", async () => {
  const { db } = await fixture(false);
  const { readiness } = await import("@/backend/database/readiness");
  await expect(readiness(db)).rejects.toThrow("migrations");
});

test("migrated database is ready without exposing credentials", async () => {
  const { db } = await fixture();
  const { readiness } = await import("@/backend/database/readiness");
  await expect(readiness(db)).resolves.toEqual({ status: "ok", database: "ok" });
});

test("first bootstrap creates only the supplied administrator with a hashed password", async () => {
  const { db } = await fixture();
  const { seedDatabase } = await import("@/backend/database/seed");
  await expect(seedDatabase(db, seedInput)).resolves.toEqual({ created: true });
  const admin = await db.user.findUniqueOrThrow({ where: { email: seedInput.adminEmail } });
  expect(admin.role).toBe("ADMIN");
  expect(await db.user.count()).toBe(1);
  expect(admin.passwordHash).not.toBe(seedInput.adminPassword);
  expect(admin.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  expect(await verify(admin.passwordHash, seedInput.adminPassword)).toBe(true);
});

test("restarting preserves edited credentials and never adds demonstration accounts", async () => {
  const { db, url } = await fixture();
  const { seedDatabase } = await import("@/backend/database/seed");
  await seedDatabase(db, seedInput);
  const before = await db.user.findUniqueOrThrow({ where: { email: seedInput.adminEmail } });
  await db.user.update({ where: { id: before.id }, data: { displayName: "Preserved name" } });
  await db.$disconnect();
  const { createDb } = await import("@/backend/database/db");
  const reopened = await createDb(url);
  cleanup.push(() => reopened.$disconnect());
  await expect(
    seedDatabase(reopened, { ...seedInput, adminPassword: "another-password-42" }),
  ).resolves.toEqual({ created: false });
  const after = await reopened.user.findUniqueOrThrow({ where: { id: before.id } });
  expect(after.displayName).toBe("Preserved name");
  expect(after.passwordHash).toBe(before.passwordHash);
  expect(await reopened.user.count()).toBe(1);
});

test("foreign keys remove sessions and anonymize game references without deleting other games", async () => {
  const { db } = await fixture();
  const a = await seedUser(db, { email: "a@example.test", displayName: "A" });
  const b = await seedUser(db, { email: "b@example.test", displayName: "B" });
  await db.session.create({
    data: { id: "f".repeat(64), userId: a.actor.id, expiresAt: new Date(Date.now() + 60000) },
  });
  const game = await db.game.create({ data: { mode: "AI", xId: a.actor.id } });
  await db.game.create({ data: { mode: "AI", xId: b.actor.id } });
  await db.user.delete({ where: { id: a.actor.id } });
  expect(await db.session.count()).toBe(0);
  expect((await db.game.findUniqueOrThrow({ where: { id: game.id } })).xId).toBeNull();
  expect(await db.game.count({ where: { xId: b.actor.id } })).toBe(1);
  expect(await db.game.count()).toBe(2);
});

test.each([
  "UserAvatar",
  "EmailChallenge",
  "Friendship",
  "Tournament",
  "TournamentEntry",
  "TournamentMatch",
  "StatisticsRevision",
])("readiness fails when current application table %s is missing", async (table) => {
  const { db } = await fixture();
  await db.$executeRawUnsafe(`DROP TABLE "${table}"`);
  const { readiness } = await import("@/backend/database/readiness");
  await expect(readiness(db)).rejects.toThrow("migrations");
});

test.each([
  ["User", "emailVerifiedAt"],
  ["Session", "lastSeenAt"],
  ["Game", "tournamentAttempt"],
  ["GameMove", "mark"],
  ["RateLimitBucket", "count"],
  ["UserAvatar", "revision"],
  ["EmailChallenge", "requestedRole"],
  ["Friendship", "status"],
  ["Tournament", "version"],
  ["TournamentEntry", "slot"],
  ["TournamentMatch", "attempt"],
  ["StatisticsRevision", "revision"],
])("readiness fails when current column %s.%s is missing", async (table, column) => {
  const { db } = await fixture();
  await db.$executeRawUnsafe(`ALTER TABLE "${table}" RENAME COLUMN "${column}" TO "old_column"`);
  const { readiness } = await import("@/backend/database/readiness");
  await expect(readiness(db)).rejects.toThrow("migrations");
});
