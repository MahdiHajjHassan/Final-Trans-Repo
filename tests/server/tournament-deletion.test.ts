import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { startFour } from "../helpers/tournaments";
import { createTournamentService } from "@/backend/modules/tournaments/tournaments.service";
import { createGameService } from "@/backend/modules/games/games.service";
import { createUserService } from "@/backend/modules/users/users.service";

for (const host of [false, true])
  test(`deleting ${host ? "host" : "entrant"} resolves lobby membership safely`, async () => {
    const f = await createTestDb();
    try {
      const admin = await seedUser(f.db, { role: "ADMIN" }),
        a = await seedUser(f.db),
        b = await seedUser(f.db),
        t = createTournamentService(f.db);
      const e = await t.create(a.actor, {});
      await t.join(b.actor, { code: e.inviteCode });
      await createUserService(f.db).deleteUser(admin.actor, host ? a.actor.id : b.actor.id);
      const row = await f.db.tournament.findUniqueOrThrow({ where: { id: e.id } });
      expect(row.status).toBe(host ? "CANCELLED" : "LOBBY");
      expect(await f.db.tournamentEntry.count({ where: { tournamentId: e.id } })).toBe(
        host ? 2 : 1,
      );
    } finally {
      await f.close();
    }
  });
for (const stage of ["semifinal", "final", "finished"] as const)
  test(`deleting a player at ${stage} preserves results without stranding tournament games`, async () => {
    const f = await createTestDb();
    try {
      const admin = await seedUser(f.db, { role: "ADMIN" }),
        { players: p, tournaments: t, event: e } = await startFour(f.db),
        games = createGameService(f.db),
        events: { id: string; version: number }[] = [];
      if (stage !== "semifinal") {
        await games.resign(p[1].actor, e.matches[0].currentGameId!, { expectedVersion: 1 });
        await games.resign(p[3].actor, e.matches[1].currentGameId!, { expectedVersion: 1 });
        if (stage === "finished") {
          const b = await t.read(p[0].actor, e.id);
          await games.resign(p[2].actor, b.matches[2].currentGameId!, { expectedVersion: 1 });
        }
      }
      await createUserService(f.db, {
        publish: (id, version) => events.push({ id, version }),
      }).deleteUser(admin.actor, p[0].actor.id);
      const b = await t.read(p[1].actor, e.id);
      expect(b.status).toBe(stage === "finished" ? "FINISHED" : "CANCELLED");
      expect(b.championSlot).toBe(stage === "finished" ? 1 : null);
      expect(b.entries[0].profile).toBeNull();
      expect(
        await f.db.game.count({
          where: { tournamentMatch: { tournamentId: e.id }, status: "ACTIVE" },
        }),
      ).toBe(0);
      expect(new Set(events.map((v) => v.id)).size).toBe(events.length);
      if (stage !== "finished")
        expect(
          await f.db.game.count({ where: { reason: "TOURNAMENT_CANCELLED" } }),
        ).toBeGreaterThan(0);
    } finally {
      await f.close();
    }
  });
