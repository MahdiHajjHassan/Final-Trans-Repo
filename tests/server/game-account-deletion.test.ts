import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createGameService } from "@/server/games/service";
import { createUserService } from "@/server/users/service";
test("deleting a player terminates active games, cancels waiting games and anonymizes history", async () => {
  const f = await createTestDb();
  try {
    const admin = await seedUser(f.db, { role: "ADMIN" }),
      a = await seedUser(f.db),
      b = await seedUser(f.db);
    const games = createGameService(f.db);
    const waiting = await games.create(a.actor, { mode: "HUMAN" });
    const human = await games.create(a.actor, { mode: "HUMAN" });
    await games.join(b.actor, { code: human.inviteCode });
    const ai = await games.create(a.actor, { mode: "AI" });
    const ended = await games.create(a.actor, { mode: "HUMAN" });
    const joined = await games.join(b.actor, { code: ended.inviteCode });
    const finished = await games.resign(a.actor, ended.game.id, {
      expectedVersion: joined.game.version,
    });
    const published: Array<{ id: string; version: number }> = [];
    await createUserService(f.db, {
      publish: (id, version) => published.push({ id, version }),
    }).deleteUser(admin.actor, a.actor.id);
    expect(await f.db.game.findUnique({ where: { id: waiting.game.id } })).toMatchObject({
      status: "CANCELLED",
      turn: null,
      xId: null,
    });
    const after = (await games.read(b.actor, human.game.id)).game;
    expect(after).toMatchObject({
      status: "FINISHED",
      winner: "O",
      reason: "ACCOUNT_DELETED",
      players: { X: { kind: "DELETED" } },
    });
    expect(await f.db.game.findUnique({ where: { id: ai.game.id } })).toMatchObject({
      status: "FINISHED",
      winner: "O",
      xId: null,
    });
    const anonymized = (await games.read(b.actor, ended.game.id)).game;
    expect(anonymized).toMatchObject({
      winner: "O",
      reason: "RESIGNED",
      version: finished.version + 1,
      players: { X: { kind: "DELETED" } },
    });
    expect(published).toContainEqual({ id: ended.game.id, version: finished.version + 1 });
  } finally {
    await f.close();
  }
});

test("account deletion racing an independent move leaves one terminal result and valid move rows", async () => {
  const f = await createTestDb();
  const { createDb } = await import("@/server/db");
  const second = await createDb(f.url);
  try {
    const admin = await seedUser(f.db, { role: "ADMIN" }),
      a = await seedUser(f.db),
      b = await seedUser(f.db);
    const games = createGameService(f.db),
      room = await games.create(a.actor, { mode: "HUMAN" }),
      joined = await games.join(b.actor, { code: room.inviteCode });
    const results = await Promise.allSettled([
      createGameService(second).move(a.actor, room.game.id, {
        cell: 0,
        expectedVersion: joined.game.version,
      }),
      createUserService(f.db).deleteUser(admin.actor, a.actor.id),
    ]);
    expect(results[1].status).toBe("fulfilled");
    const after = (await games.read(b.actor, room.game.id)).game;
    expect(after).toMatchObject({
      status: "FINISHED",
      winner: "O",
      reason: "ACCOUNT_DELETED",
      turn: null,
      players: { X: { kind: "DELETED" } },
    });
    expect(await f.db.gameMove.count({ where: { gameId: room.game.id } })).toBe(
      results[0].status === "fulfilled" ? 1 : 0,
    );
    if (results[0].status === "rejected")
      expect(["UNAUTHENTICATED", "CONFLICT"]).toContain(results[0].reason.code);
  } finally {
    await second.$disconnect();
    await f.close();
  }
});
