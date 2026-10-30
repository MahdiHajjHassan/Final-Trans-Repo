import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createDb } from "@/backend/database/db";
import { createTournamentService } from "@/backend/modules/tournaments/tournaments.service";

test("lobby requires four distinct players, host start and stable fixed pairings", async () => {
  const f = await createTestDb();
  try {
    const p = await Promise.all(Array.from({ length: 5 }, () => seedUser(f.db))),
      s = createTournamentService(f.db);
    let e = await s.create(p[0].actor, {});
    const code = e.inviteCode;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(e.entries).toHaveLength(1);
    await expect(s.start(p[0].actor, e.id, { expectedVersion: e.version })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    e = await s.join(p[1].actor, { code: code!.toLowerCase() });
    expect(e.inviteCode).toBeNull();
    expect((await s.join(p[1].actor, { code })).entries).toHaveLength(2);
    await expect(s.cancel(p[1].actor, e.id, { expectedVersion: e.version })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(s.read(p[4].actor, e.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await s.leave(p[1].actor, e.id, { expectedVersion: e.version });
    e = await s.join(p[1].actor, { code });
    e = await s.join(p[2].actor, { code });
    e = await s.join(p[3].actor, { code });
    await expect(s.join(p[4].actor, { code })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(s.start(p[1].actor, e.id, { expectedVersion: e.version })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(s.start(p[0].actor, e.id, { expectedVersion: 1 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    e = await s.start(p[0].actor, e.id, { expectedVersion: e.version });
    expect(e.status).toBe("RUNNING");
    expect(e.matches.map((m) => m.slot)).toEqual(["SF1", "SF2", "FINAL"]);
    expect(e.matches.filter((m) => m.status === "ACTIVE")).toHaveLength(2);
    const games = await f.db.game.findMany();
    expect(games).toHaveLength(2);
    expect(
      games.every((g) => g.status === "ACTIVE" && g.mode === "HUMAN" && g.inviteCode === null),
    ).toBe(true);
    expect(games.some((g) => g.xId === p[0].actor.id && g.oId === p[1].actor.id)).toBe(true);
    expect(JSON.stringify(e)).not.toContain(p[0].email);
    expect(JSON.stringify(e)).not.toContain('"cells"');
  } finally {
    await f.close();
  }
});
test("concurrent last-seat joins and start requests create one fixed bracket", async () => {
  const f = await createTestDb(),
    other = await createDb(f.url);
  try {
    const p = await Promise.all(Array.from({ length: 5 }, () => seedUser(f.db))),
      a = createTournamentService(f.db),
      b = createTournamentService(other);
    let e = await a.create(p[0].actor, {});
    const code = e.inviteCode;
    await a.join(p[1].actor, { code });
    await a.join(p[2].actor, { code });
    const joined = await Promise.allSettled([
      a.join(p[3].actor, { code }),
      b.join(p[4].actor, { code }),
    ]);
    expect(joined.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.db.tournamentEntry.count()).toBe(4);
    e = await a.read(p[0].actor, e.id);
    const started = await Promise.allSettled([
      a.start(p[0].actor, e.id, { expectedVersion: e.version }),
      b.start(p[0].actor, e.id, { expectedVersion: e.version }),
    ]);
    expect(started.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.db.tournamentMatch.count()).toBe(3);
    expect(await f.db.game.count()).toBe(2);
  } finally {
    await other.$disconnect();
    await f.close();
  }
});
