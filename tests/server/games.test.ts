import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createGameService } from "@/backend/modules/games/games.service";
import { createDb } from "@/backend/database/db";

test("friends join one room, alternate moves, finish a win and cannot alter the result", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      c = await seedUser(f.db);
    const games = createGameService(f.db);
    const room = await games.create(a.actor, { mode: "HUMAN" });
    expect(room.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    await expect(games.join(a.actor, { code: room.inviteCode })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    let state = (await games.join(b.actor, { code: " " + room.inviteCode!.toLowerCase() + " " }))
      .game;
    await expect(games.read(c.actor, state.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      games.move(b.actor, state.id, { cell: 0, expectedVersion: state.version }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    for (const [i, cell] of [0, 3, 1, 4, 2].entries())
      state = await games.move(i % 2 === 0 ? a.actor : b.actor, state.id, {
        cell,
        expectedVersion: state.version,
      });
    expect(state).toMatchObject({
      status: "FINISHED",
      winner: "X",
      reason: "LINE",
      winningLine: [0, 1, 2],
      turn: null,
    });
    await expect(
      games.move(b.actor, state.id, { cell: 8, expectedVersion: state.version }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await f.db.gameMove.count()).toBe(5);
    expect(JSON.stringify(state)).not.toContain(a.email);
    expect(JSON.stringify(state)).not.toContain(room.inviteCode!);
  } finally {
    await f.close();
  }
});
test("AI replies atomically; input validation, stale versions, cancellation and resignation are enforced", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db);
    const games = createGameService(f.db, { random: () => 0 });
    const { game } = await games.create(a.actor, { mode: "AI" });
    const after = await games.move(a.actor, game.id, { cell: 0, expectedVersion: 1 });
    expect(after.version).toBe(3);
    expect(after.cells[0]).toBe("X");
    expect(after.cells[4]).toBe("O");
    expect(await f.db.gameMove.count()).toBe(2);
    await expect(
      games.move(a.actor, game.id, { cell: 1, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      games.move(a.actor, game.id, { cell: 1, expectedVersion: 3, winner: "X" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await games.resign(a.actor, game.id, { expectedVersion: 3 })).toMatchObject({
      winner: "O",
      reason: "RESIGNED",
      status: "FINISHED",
    });
    const room = await games.create(a.actor, { mode: "HUMAN" });
    expect(await games.cancel(a.actor, room.game.id, { expectedVersion: 1 })).toMatchObject({
      status: "CANCELLED",
    });
    await expect(games.create(null, { mode: "AI" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  } finally {
    await f.close();
  }
});
test("independent connections accept exactly one joining player and one move for a revision", async () => {
  const f = await createTestDb();
  const second = await createDb(f.url);
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      c = await seedUser(f.db);
    const one = createGameService(f.db),
      two = createGameService(second);
    const room = await one.create(a.actor, { mode: "HUMAN" });
    const joins = await Promise.allSettled([
      one.join(b.actor, { code: room.inviteCode }),
      two.join(c.actor, { code: room.inviteCode }),
    ]);
    expect(joins.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(joins.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
    const active = (await one.read(a.actor, room.game.id)).game;
    const moves = await Promise.allSettled([
      one.move(a.actor, active.id, { cell: 0, expectedVersion: active.version }),
      two.move(a.actor, active.id, { cell: 1, expectedVersion: active.version }),
    ]);
    expect(moves.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.db.gameMove.count()).toBe(1);
    expect((await one.read(a.actor, active.id)).game.cells.filter(Boolean)).toHaveLength(1);
  } finally {
    await second.$disconnect();
    await f.close();
  }
});
