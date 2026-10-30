import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createGameService } from "@/backend/modules/games/games.service";
import { createDb } from "@/backend/database/db";

test("ordinary saved games keep null tournament links and persist through database reopen", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      games = createGameService(f.db);
    const g = await games.create(a.actor, { mode: "AI" });
    expect(await f.db.game.findUnique({ where: { id: g.game.id } })).toMatchObject({
      tournamentMatchId: null,
      tournamentAttempt: null,
    });
    const reopened = await createDb(f.url);
    try {
      expect(await reopened.user.count()).toBe(1);
      expect(await reopened.game.count()).toBe(1);
    } finally {
      await reopened.$disconnect();
    }
  } finally {
    await f.close();
  }
});
