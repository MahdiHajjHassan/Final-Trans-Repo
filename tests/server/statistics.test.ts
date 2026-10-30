import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { finishedHuman } from "../helpers/finished-games";
import { createStatisticsService } from "@/backend/modules/statistics/statistics.service";
import { createUserService } from "@/backend/modules/users/users.service";
import { createGameService } from "@/backend/modules/games/games.service";
import { startFour } from "../helpers/tournaments";

test("two wins one loss and one draw produce seven points without AI or deletion-forfeit inflation", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      admin = await seedUser(f.db, { role: "ADMIN" }),
      stats = createStatisticsService(f.db);
    expect(await stats.summary(a.actor)).toMatchObject({
      played: 0,
      rank: null,
      points: 0,
      level: 1,
      progress: 0,
    });
    await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    await finishedHuman(f.db, b.actor.id, a.actor.id, "O");
    await finishedHuman(f.db, a.actor.id, b.actor.id, "O");
    await finishedHuman(f.db, b.actor.id, a.actor.id, "DRAW");
    expect(await stats.summary(a.actor)).toMatchObject({
      played: 4,
      wins: 2,
      losses: 1,
      draws: 1,
      points: 7,
      winRate: 50,
      rank: 1,
      level: 1,
      progress: 7,
    });
    const game = await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    await f.db.game.update({ where: { id: game.id }, data: { mode: "AI", oId: null } });
    const forfeited = await finishedHuman(f.db, a.actor.id, b.actor.id, "X");
    await f.db.game.update({ where: { id: forfeited.id }, data: { reason: "ACCOUNT_DELETED" } });
    expect((await stats.summary(a.actor)).points).toBe(7);
    expect((await stats.history(a.actor, { mode: "AI" })).total).toBe(1);
    expect((await stats.history(a.actor, {})).total).toBe(6);
    expect(JSON.stringify(await stats.leaderboard(a.actor, {}))).not.toContain(b.email);
    await createUserService(f.db).deleteUser(admin.actor, b.actor.id);
    expect((await stats.summary(a.actor)).points).toBe(7);
    expect(
      (await stats.history(a.actor, { mode: "HUMAN" })).items.every(
        (row) => row.opponent.kind === "DELETED",
      ),
    ).toBe(true);
    expect((await stats.leaderboard(a.actor, {})).total).toBe(1);
    await expect(stats.history(null, {})).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(stats.history(a.actor, { userId: admin.actor.id })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  } finally {
    await f.close();
  }
});
test("levels and three achievements cross exact thresholds, while history paginates stably", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      stats = createStatisticsService(f.db);
    for (let i = 0; i < 3; i++)
      await finishedHuman(f.db, a.actor.id, b.actor.id, "X", new Date(1700000000000 + i * 1000));
    await finishedHuman(f.db, a.actor.id, b.actor.id, "DRAW", new Date(1700000004000));
    expect(await stats.summary(a.actor)).toMatchObject({ points: 10, level: 2, progress: 0 });
    expect(
      (await stats.summary(a.actor)).achievements.find((a) => a.id === "TEN_MATCHES")?.earned,
    ).toBe(false);
    for (let i = 4; i < 11; i++)
      await finishedHuman(f.db, a.actor.id, b.actor.id, "DRAW", new Date(1700000000000 + i * 1000));
    const summary = await stats.summary(a.actor);
    expect(summary.played).toBe(11);
    expect(summary.achievements.every((a) => a.earned)).toBe(true);
    const first = await stats.history(a.actor, {}),
      last = await stats.history(a.actor, { page: 2 });
    expect(first.items).toHaveLength(10);
    expect(last.items).toHaveLength(1);
    expect(first.items[0].finishedAt > last.items[0].finishedAt).toBe(true);
  } finally {
    await f.close();
  }
});
test("leaderboard ties use stable IDs and positions across the 25-row boundary", async () => {
  const f = await createTestDb();
  try {
    const p = [];
    for (let i = 0; i < 26; i++) p.push(await seedUser(f.db));
    await f.db.user.updateMany({ data: { createdAt: new Date("2026-01-01T00:00:00Z") } });
    for (let i = 0; i < p.length; i++)
      await finishedHuman(f.db, p[i].actor.id, p[(i + 1) % p.length].actor.id, "X");
    const stats = createStatisticsService(f.db),
      one = await stats.leaderboard(p[0].actor, {}),
      two = await stats.leaderboard(p[0].actor, { page: 2 });
    expect(one.total).toBe(26);
    expect(one.items).toHaveLength(25);
    expect(two.items[0].rank).toBe(26);
    expect([...one.items, ...two.items].map((row) => row.profile.id)).toEqual(
      p.map((user) => user.actor.id).sort(),
    );
  } finally {
    await f.close();
  }
});
test("tournament replays count once and concurrent game completion never mixes summary and rank", async () => {
  const f = await createTestDb();
  try {
    const { players: p, event: e } = await startFour(f.db),
      games = createGameService(f.db),
      stats = createStatisticsService(f.db);
    let state = (await games.read(p[0].actor, e.matches[0].currentGameId!)).game;
    for (const [i, cell] of [0, 1, 2, 4, 3, 5, 7, 6, 8].entries())
      state = await games.move(p[i % 2].actor, state.id, { cell, expectedVersion: state.version });
    expect(await stats.summary(p[0].actor)).toMatchObject({ played: 1, draws: 1, points: 1 });
    const [summary] = await Promise.all([
      stats.summary(p[2].actor),
      games.resign(p[3].actor, e.matches[1].currentGameId!, { expectedVersion: 1 }),
    ]);
    expect(summary.played === 0 ? summary.rank === null : summary.rank !== null).toBe(true);
    expect(await stats.summary(p[2].actor)).toMatchObject({ played: 1, wins: 1, points: 3 });
  } finally {
    await f.close();
  }
});
