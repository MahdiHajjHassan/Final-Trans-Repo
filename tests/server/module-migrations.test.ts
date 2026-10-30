import { expect, test } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import Sqlite from "better-sqlite3";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createGameService } from "@/backend/modules/games/games.service";
import { createProfileService } from "@/backend/modules/profiles/profiles.service";

test("additive module migrations preserve populated legacy users sessions and finished games", async () => {
  const f = await createTestDb({ migrate: false }),
    raw = new Sqlite(f.url.slice(5));
  try {
    raw.pragma("foreign_keys = ON");
    const names = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((p) => p.isDirectory())
      .map((p) => p.name)
      .sort();
    for (const name of names.filter((n) => n < "202610300100"))
      raw.exec(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      userBefore = await f.db.user.findUniqueOrThrow({ where: { id: a.actor.id } });
    const token = randomBytes(32).toString("hex"),
      sessionId = createHash("sha256").update(token).digest("hex"),
      id = randomUUID(),
      date = "2026-10-01T12:00:00.000Z";
    raw
      .prepare("INSERT INTO Session (id,userId,expiresAt) VALUES (?,?,?)")
      .run(sessionId, a.actor.id, "2030-10-01T12:00:00.000Z");
    raw
      .prepare(
        "INSERT INTO Game (id,mode,xId,oId,board,turn,status,winner,reason,version,createdAt,updatedAt,finishedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        "HUMAN",
        a.actor.id,
        b.actor.id,
        "XXXOO....",
        null,
        "FINISHED",
        "X",
        "LINE",
        6,
        date,
        date,
        date,
      );
    for (const [i, cell] of [0, 3, 1, 4, 2].entries())
      raw
        .prepare("INSERT INTO GameMove (id,gameId,ply,mark,cell) VALUES (?,?,?,?,?)")
        .run(randomUUID(), id, i + 1, i % 2 === 0 ? "X" : "O", cell);
    for (const name of names.filter((n) => n >= "202610300100"))
      raw.exec(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
    const userAfter = await f.db.user.findUniqueOrThrow({ where: { id: a.actor.id } });
    expect(userAfter).toEqual(userBefore);
    const session = await f.db.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.userId).toBe(a.actor.id);
    expect(session.lastSeenAt).toBeNull();
    const game = (await createGameService(f.db).read(a.actor, id)).game;
    expect(game).toMatchObject({ status: "FINISHED", winner: "X", version: 6, tournament: null });
    expect(game.cells).toEqual(["X", "X", "X", "O", "O", null, null, null, null]);
    expect(await f.db.gameMove.count()).toBe(5);
    expect((await createProfileService(f.db).read(a.actor, a.actor.id)).avatarUrl).toBe(
      "/default-avatar.svg",
    );
    expect(raw.pragma("foreign_key_check")).toEqual([]);
  } finally {
    raw.close();
    await f.close();
  }
});
