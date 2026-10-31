import { expect, test } from "vitest";
import Sqlite from "better-sqlite3";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { finishedHuman } from "../helpers/finished-games";
import { createStatisticsService } from "@/backend/modules/statistics/statistics.service";
import { createStatisticsHandlers } from "@/backend/modules/statistics/statistics.controller";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import { sessionCookieName } from "@/backend/modules/auth/session.guard";

// Observe real SQLite aggregates without replacing any service/query implementation.
function observeRanking(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  let scans = 0;
  const observed = db.$extends({
    query: {
      $queryRaw({ args, query }) {
        if (args.strings.join(" ").includes("WITH seats AS")) scans++;
        return query(args);
      },
    },
  });
  return { db: observed as unknown as typeof db, scans: () => scans };
}

test("repeated summary and leaderboard reads reuse bounded aggregates and count the empty last page exactly", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    const observed = observeRanking(f.db),
      stats = createStatisticsService(observed.db);
    expect((await stats.leaderboard(a.actor)).total).toBe(2);
    expect(observed.scans()).toBe(1);
    for (let i = 0; i < 10; i++) {
      expect((await stats.leaderboard(a.actor)).items[0].points).toBe(3);
      expect((await stats.summary(a.actor)).points).toBe(3);
    }
    expect(observed.scans()).toBe(2);
    expect(await stats.leaderboard(a.actor, { page: 100000 })).toMatchObject({
      items: [],
      total: 2,
    });
    expect(observed.scans()).toBe(3);
  } finally {
    await f.close();
  }
});

test("cached ranks follow committed game changes and external writes; names refresh without scans and rollback leaves no ghost revision", async () => {
  const f = await createTestDb();
  const external = new Sqlite(f.url.slice(5));
  try {
    external.pragma("foreign_keys = ON");
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    const game = await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    const observed = observeRanking(f.db),
      stats = createStatisticsService(observed.db);
    await stats.leaderboard(a.actor);
    await f.db.user.update({ where: { id: b.actor.id }, data: { displayName: "New name" } });
    expect((await stats.leaderboard(a.actor)).items[1].profile.displayName).toBe("New name");
    expect(observed.scans()).toBe(1);
    external.exec("BEGIN");
    external.prepare('UPDATE "Game" SET winner=? WHERE id=?').run("O", game.id);
    external.exec("ROLLBACK");
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(a.actor.id);
    expect(observed.scans()).toBe(1);
    external.prepare('UPDATE "Game" SET winner=? WHERE id=?').run("O", game.id);
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(b.actor.id);
    expect(observed.scans()).toBe(2);
    await f.db.game.update({ where: { id: game.id }, data: { reason: "ACCOUNT_DELETED" } });
    expect((await stats.leaderboard(a.actor)).total).toBe(0);
    await f.db.game.update({ where: { id: game.id }, data: { reason: "LINE" } });
    expect((await stats.leaderboard(a.actor)).total).toBe(2);
    await f.db.user.delete({ where: { id: b.actor.id } });
    expect(await stats.summary(a.actor)).toMatchObject({ played: 1, losses: 1, rank: 1 });
    await expect(stats.summary(b.actor)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await f.db.game.delete({ where: { id: game.id } });
    expect((await stats.leaderboard(a.actor)).total).toBe(0);
  } finally {
    external.close();
    await f.close();
  }
});

test("authenticated HTTP statistics reads have a member budget shared between endpoints, with room for four members", async () => {
  const f = await createTestDb();
  try {
    const stats = createStatisticsService(f.db, { now: () => new Date("2026-10-31T00:00:00Z") }),
      handlers = createStatisticsHandlers(stats, createAuthService(f.db));
    const headers = [];
    for (let i = 0; i < 4; i++) {
      const user = await seedUser(f.db),
        session = await createSessionToken(f.db, user.actor.id, new Date());
      headers.push({
        cookie: `${sessionCookieName}=${session.token}`,
        "x-forwarded-for": "127.0.0.1",
      });
    }
    for (let i = 0; i < 120; i++)
      for (const h of headers) {
        const method = i % 2 ? handlers.summary : handlers.leaderboard;
        expect((await method(new Request("https://localhost/", { headers: h }))).status).toBe(200);
      }
    const denied = await handlers.summary(
      new Request("https://localhost/", { headers: headers[0] }),
    );
    expect(denied.status).toBe(429);
    expect(Number(denied.headers.get("retry-after"))).toBeGreaterThan(0);
  } finally {
    await f.close();
  }
});

test("expensive misses have a shared budget while cached reads remain available, and cache entries are evicted", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    let time = Date.parse("2026-10-31T00:00:00Z");
    const observed = observeRanking(f.db),
      stats = createStatisticsService(observed.db, { now: () => new Date(time) });
    for (let page = 1; page <= 30; page++) await stats.leaderboard(a.actor, { page });
    await expect(stats.leaderboard(b.actor, { page: 31 })).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    expect(observed.scans()).toBe(30);
    expect((await stats.leaderboard(b.actor)).total).toBe(2);
    expect(observed.scans()).toBe(30);
    for (let page = 31; page <= 129; page++) {
      time += 60_000;
      await stats.leaderboard(a.actor, { page });
    }
    expect(observed.scans()).toBe(129);
    time += 60_000;
    await stats.leaderboard(a.actor, { page: 2 });
    expect(observed.scans()).toBe(130);
    // Advancing time expires quotas, not results: the most recently used entry survives.
    await stats.leaderboard(a.actor, { page: 129 });
    expect(observed.scans()).toBe(130);
  } finally {
    await f.close();
  }
});

test("ranking revision ignores active boards, presence and quota writes but follows tie ordering changes", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    await finishedHuman(f.db, a.actor.id, b.actor.id, "DRAW");
    await f.db.user.update({
      where: { id: a.actor.id },
      data: { createdAt: new Date("2020-01-01") },
    });
    const observed = observeRanking(f.db),
      stats = createStatisticsService(observed.db);
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(a.actor.id);
    const active = await f.db.game.create({
      data: { mode: "HUMAN", status: "ACTIVE", xId: a.actor.id, oId: b.actor.id },
    });
    await f.db.game.update({
      where: { id: active.id },
      data: { board: "X........", turn: "O", version: 2 },
    });
    await createSessionToken(f.db, a.actor.id, new Date());
    await f.db.session.updateMany({
      where: { userId: a.actor.id },
      data: { lastSeenAt: new Date() },
    });
    await stats.leaderboard(a.actor);
    expect(observed.scans()).toBe(1);
    await f.db.user.update({
      where: { id: b.actor.id },
      data: { createdAt: new Date("2010-01-01") },
    });
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(b.actor.id);
    expect(observed.scans()).toBe(2);
  } finally {
    await f.close();
  }
});

test("a concurrent WAL writer between revision read and miss quota retries a fresh ranking snapshot", async () => {
  const f = await createTestDb(),
    external = new Sqlite(f.url.slice(5));
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    const game = await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    let changed = false;
    const observed = f.db.$extends({
      query: {
        $queryRaw: async ({ args, query }) => {
          const result = await query(args);
          if (
            !changed &&
            args.strings.join(" ").includes('SELECT revision FROM "StatisticsRevision"')
          ) {
            changed = true;
            external.prepare('UPDATE "Game" SET winner=? WHERE id=?').run("O", game.id);
          }
          return result;
        },
      },
    });
    const stats = createStatisticsService(observed as unknown as typeof f.db);
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(b.actor.id);
    expect(changed).toBe(true);
    expect((await stats.leaderboard(a.actor)).items[0].profile.id).toBe(b.actor.id);
  } finally {
    external.close();
    await f.close();
  }
});

test("overlapping reads on the production adapter share one current ranking build", async () => {
  const f = await createTestDb(),
    external = new Sqlite(f.url.slice(5));
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    const game = await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    const observed = observeRanking(f.db),
      stats = createStatisticsService(observed.db);
    const pages = await Promise.all(Array.from({ length: 8 }, () => stats.leaderboard(a.actor)));
    expect(pages.every((page) => page.items[0].profile.id === a.actor.id)).toBe(true);
    expect(observed.scans()).toBe(1);
    external.prepare('UPDATE "Game" SET winner=? WHERE id=?').run("O", game.id);
    const changed = await Promise.all(Array.from({ length: 8 }, () => stats.leaderboard(a.actor)));
    expect(changed.every((page) => page.items[0].profile.id === b.actor.id)).toBe(true);
    expect(observed.scans()).toBe(2);
  } finally {
    external.close();
    await f.close();
  }
});
