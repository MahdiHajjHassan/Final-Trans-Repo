import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import Sqlite from "better-sqlite3";
import { createTestDb } from "../helpers/db";
import { startFour } from "../helpers/tournaments";
import { createDb } from "@/backend/database/db";
import { createGameService } from "@/backend/modules/games/games.service";
import { settleTournamentGame } from "@/backend/modules/tournaments/tournament-results";
import { createGameStream } from "@/backend/modules/realtime/game-stream";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";

const draw = [0, 1, 2, 4, 3, 5, 7, 6, 8],
  win = [0, 3, 1, 4, 2];
test("draw replays switch seats, semifinal winners produce one final and champion persists", async () => {
  const f = await createTestDb();
  try {
    const { players: p, tournaments: t, event: e } = await startFour(f.db),
      games = createGameService(f.db);
    const first = e.matches[0],
      original = await f.db.game.findUniqueOrThrow({ where: { id: first.currentGameId! } });
    let state = (await games.read(p[0].actor, original.id)).game;
    for (const [i, cell] of draw.entries())
      state = await games.move(p[i % 2].actor, state.id, { cell, expectedVersion: state.version });
    let bracket = await t.read(p[0].actor, e.id);
    const m = bracket.matches[0];
    expect(m.attempt).toBe(2);
    expect(m.winnerEntryId).toBeNull();
    const replay = await f.db.game.findUniqueOrThrow({ where: { id: m.currentGameId! } });
    expect(replay.xId).toBe(original.oId);
    await f.db.$transaction((tx) => settleTournamentGame(tx, original.id));
    expect(await f.db.game.count()).toBe(3);
    state = (await games.read(p[1].actor, replay.id)).game;
    for (const [i, cell] of win.entries())
      state = await games.move(p[i % 2 === 0 ? 1 : 0].actor, state.id, {
        cell,
        expectedVersion: state.version,
      });
    const sf2 = (await games.read(p[2].actor, e.matches[1].currentGameId!)).game;
    await games.resign(p[3].actor, sf2.id, { expectedVersion: sf2.version });
    bracket = await t.read(p[0].actor, e.id);
    expect(bracket.matches[2].status).toBe("ACTIVE");
    expect(await f.db.game.count()).toBe(4);
    const final = (await games.read(p[1].actor, bracket.matches[2].currentGameId!)).game;
    await games.resign(p[2].actor, final.id, { expectedVersion: final.version });
    bracket = await t.read(p[0].actor, e.id);
    expect(bracket).toMatchObject({ status: "FINISHED", championSlot: 2 });
    const other = await createDb(f.url);
    try {
      expect(await other.tournament.findUnique({ where: { id: e.id } })).toMatchObject({
        status: "FINISHED",
        championSlot: 2,
      });
    } finally {
      await other.$disconnect();
    }
  } finally {
    await f.close();
  }
});
test("concurrent semifinal results create only one final and unseated members cannot spectate", async () => {
  const f = await createTestDb(),
    other = await createDb(f.url);
  try {
    const { players: p, event: e } = await startFour(f.db),
      one = createGameService(f.db),
      two = createGameService(other);
    await Promise.all([
      one.resign(p[0].actor, e.matches[0].currentGameId!, { expectedVersion: 1 }),
      two.resign(p[2].actor, e.matches[1].currentGameId!, { expectedVersion: 1 }),
    ]);
    expect(await f.db.game.count()).toBe(3);
    const final = await f.db.tournamentMatch.findFirstOrThrow({
      where: { tournamentId: e.id, slot: "FINAL" },
    });
    expect(final.status).toBe("ACTIVE");
    await expect(one.read(p[2].actor, e.matches[0].currentGameId!)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      one.move(p[2].actor, e.matches[0].currentGameId!, { cell: 0, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      one.resign(p[2].actor, e.matches[0].currentGameId!, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const token = await createSessionToken(f.db, p[2].actor.id, new Date());
    await expect(
      createGameStream(
        new Request("https://localhost/events", {
          headers: { cookie: `${sessionCookieName}=${token.token}` },
        }),
        e.matches[0].currentGameId!,
        { auth: createAuthService(f.db), games: one },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  } finally {
    await other.$disconnect();
    await f.close();
  }
});
test("failed replay creation rolls back the terminal move and publishes nothing", async () => {
  const f = await createTestDb();
  try {
    const { players: p, event: e } = await startFour(f.db),
      published: string[] = [],
      games = createGameService(f.db, { publish: (id) => published.push(id) });
    let state = (await games.read(p[0].actor, e.matches[0].currentGameId!)).game;
    for (const [i, cell] of draw.slice(0, 8).entries())
      state = await games.move(p[i % 2].actor, state.id, { cell, expectedVersion: state.version });
    const before = published.length,
      raw = new Sqlite(f.url.slice(5));
    raw.exec(
      "CREATE TRIGGER fail_replay BEFORE INSERT ON Game WHEN NEW.tournamentAttempt = 2 BEGIN SELECT RAISE(ABORT,'test rollback'); END",
    );
    await expect(
      games.move(p[0].actor, state.id, { cell: 8, expectedVersion: state.version }),
    ).rejects.toBeDefined();
    expect(published).toHaveLength(before);
    expect((await games.read(p[0].actor, state.id)).game.status).toBe("ACTIVE");
    expect(await f.db.gameMove.count({ where: { gameId: state.id } })).toBe(8);
    raw.exec("DROP TRIGGER fail_replay");
    raw.close();
    await games.move(p[0].actor, state.id, { cell: 8, expectedVersion: state.version });
    expect(published).toHaveLength(before + 1);
  } finally {
    await f.close();
  }
});
