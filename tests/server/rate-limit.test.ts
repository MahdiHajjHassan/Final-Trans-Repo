import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function fixture() {
  const value = await createTestDb();
  cleanup.push(value.close);
  return value;
}

test("atomic limits admit at most the allowance under concurrent requests", async () => {
  const { db } = await fixture();
  const { createRateLimiter } = await import("@/backend/common/security/rate-limit");
  const consume = createRateLimiter(db, () => new Date("2026-10-27T00:00:05Z"));
  const results = await Promise.all(
    Array.from({ length: 15 }, () => consume("test", "private@example.test", 5, 60)),
  );
  expect(results.filter((result) => result.allowed)).toHaveLength(5);
  expect(
    results.filter((result) => !result.allowed).map((result) => result.retryAfterSeconds),
  ).toEqual(Array(10).fill(55));
  expect((await db.rateLimitBucket.findFirstOrThrow()).key).not.toContain("private@example.test");
});

test("limits persist across service instances and reset only at the next window", async () => {
  const { db } = await fixture();
  const { createRateLimiter } = await import("@/backend/common/security/rate-limit");
  let now = new Date("2026-10-27T00:00:10Z");
  const first = createRateLimiter(db, () => now);
  expect((await first("test", "client", 1, 60)).allowed).toBe(true);
  const reopened = createRateLimiter(db, () => now);
  expect(await reopened("test", "client", 1, 60)).toEqual({
    allowed: false,
    retryAfterSeconds: 50,
  });
  now = new Date("2026-10-27T00:01:00Z");
  expect((await reopened("test", "client", 1, 60)).allowed).toBe(true);
});

test("login throttles repeated guesses for one email/client before allowing another verification", async () => {
  const { db } = await fixture();
  const { createAuthService } = await import("@/backend/modules/auth/auth.service");
  const auth = createAuthService(db);
  const user = await seedUser(db);
  for (let i = 0; i < 5; i++)
    await expect(
      auth.login({ email: user.email, password: "wrong-password-42" }, "client"),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(
    auth.login({ email: user.email, password: user.password }, "client"),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  const otherClient = await auth.login(
    { email: user.email, password: user.password },
    "other-client",
  );
  await expect(auth.resolveSession(otherClient.token)).resolves.toEqual(user.actor);
});

test("limiter use prunes stale buckets while preserving current limits", async () => {
  const { db } = await fixture();
  await db.rateLimitBucket.create({
    data: { key: "stale-test-bucket", windowStart: new Date("2026-10-20T00:00:00Z"), count: 99 },
  });
  const { createRateLimiter } = await import("@/backend/common/security/rate-limit");
  const consume = createRateLimiter(db, () => new Date("2026-10-27T00:00:10Z"));
  expect((await consume("test", "client", 1, 60)).allowed).toBe(true);
  expect(await db.rateLimitBucket.findUnique({ where: { key: "stale-test-bucket" } })).toBeNull();
  expect((await consume("test", "client", 1, 60)).allowed).toBe(false);
});
