import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

test("game storage persists independent matches and rejects duplicate cells or plies", async () => {
  const fixture = await createTestDb();
  try {
    const user = await seedUser(fixture.db);
    const game = await fixture.db.game.create({
      data: { mode: "AI", xId: user.actor.id, status: "ACTIVE" },
    });
    expect(game.board).toBe(".........");
    expect(game.version).toBe(1);
    await fixture.db.gameMove.create({ data: { gameId: game.id, ply: 1, mark: "X", cell: 0 } });
    await expect(
      fixture.db.gameMove.create({ data: { gameId: game.id, ply: 1, mark: "O", cell: 1 } }),
    ).rejects.toThrow();
    await expect(
      fixture.db.gameMove.create({ data: { gameId: game.id, ply: 2, mark: "O", cell: 0 } }),
    ).rejects.toThrow();
    expect(await fixture.db.gameMove.count()).toBe(1);
  } finally {
    await fixture.close();
  }
});
