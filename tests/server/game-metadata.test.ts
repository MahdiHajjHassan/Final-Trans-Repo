import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createUserService } from "@/backend/modules/users/users.service";
import { createGameService } from "@/backend/modules/games/games.service";

test("self, admin and direct SQL name changes advance metadata without rewriting saved boards", async () => {
  const f = await createTestDb();
  try {
    const x = await seedUser(f.db),
      o = await seedUser(f.db),
      admin = await seedUser(f.db, { role: "ADMIN" });
    const games = createGameService(f.db),
      auth = createAuthService(f.db),
      users = createUserService(f.db);
    const room = await games.create(x.actor, { mode: "HUMAN" });
    expect(room.game.playerMetadataVersion).toBe(1);
    const joined = await games.join(o.actor, { code: room.inviteCode });
    expect(joined.game.playerMetadataVersion).toBe(2);
    const finished = await games.resign(x.actor, room.game.id, {
      expectedVersion: joined.game.version,
    });
    const saved = await f.db.game.findUniqueOrThrow({ where: { id: room.game.id } });
    await auth.updateAccount(x.actor, { displayName: "Self changed" });
    const first = (await games.read(x.actor, room.game.id)).game;
    expect(first.playerMetadataVersion).toBe(3);
    expect(first.players.X?.displayName).toBe("Self changed");
    await users.updateUser(admin.actor, o.actor.id, { displayName: "Admin changed" });
    const second = (await games.read(x.actor, room.game.id)).game;
    expect(second.playerMetadataVersion).toBe(4);
    expect(second.players.O?.displayName).toBe("Admin changed");
    await f.db
      .$executeRaw`UPDATE "User" SET "displayName" = ${"SQL changed"} WHERE "id" = ${x.actor.id}`;
    const third = (await games.read(x.actor, room.game.id)).game;
    expect(third.playerMetadataVersion).toBe(5);
    expect(third.players.X?.displayName).toBe("SQL changed");
    await auth.updateAccount(x.actor, { displayName: " SQL changed " });
    await users.updateUser(admin.actor, o.actor.id, { role: "ADMIN" });
    expect((await games.read(x.actor, room.game.id)).game.playerMetadataVersion).toBe(5);
    expect(await f.db.game.findUniqueOrThrow({ where: { id: room.game.id } })).toEqual(saved);
    expect(third.version).toBe(finished.version);
    expect(third.cells).toEqual(finished.cells);
    expect(await auth.account(x.actor)).not.toHaveProperty("profileVersion");
  } finally {
    await f.close();
  }
});

test("deleting a seat can lower metadata only with a newer board version", async () => {
  const f = await createTestDb();
  try {
    const x = await seedUser(f.db),
      o = await seedUser(f.db),
      admin = await seedUser(f.db, { role: "ADMIN" });
    const games = createGameService(f.db),
      auth = createAuthService(f.db);
    const room = await games.create(x.actor, { mode: "HUMAN" });
    await games.join(o.actor, { code: room.inviteCode });
    await auth.updateAccount(x.actor, { displayName: "New name" });
    const before = (await games.read(o.actor, room.game.id)).game;
    expect(before.playerMetadataVersion).toBe(3);
    await createUserService(f.db).deleteUser(admin.actor, x.actor.id);
    const after = (await games.read(o.actor, room.game.id)).game;
    expect(after.version).toBeGreaterThan(before.version);
    expect(after.playerMetadataVersion).toBe(1);
    expect(after.players.X?.kind).toBe("DELETED");
  } finally {
    await f.close();
  }
});
