import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createProfileService } from "@/backend/modules/profiles/profiles.service";

test("member profiles contain only the safe projection and name search keeps distinct IDs", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db, { displayName: "Same Name" }),
      b = await seedUser(f.db, { displayName: "Same Name" });
    const profiles = createProfileService(f.db);
    const view = await profiles.read(a.actor, b.actor.id);
    expect(Object.keys(view).sort()).toEqual(["avatarUrl", "displayName", "id", "joinedAt"]);
    expect(view.avatarUrl).toBe("/default-avatar.svg");
    const found = await profiles.search(a.actor, { q: "Same", page: 1 });
    expect(found.items.map((v) => v.id).sort()).toEqual([a.actor.id, b.actor.id].sort());
    expect(JSON.stringify(found)).not.toContain(a.email);
    expect((await profiles.search(a.actor, { q: a.email })).total).toBe(0);
    await expect(profiles.read(null, a.actor.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await expect(profiles.search(a.actor, { q: "S", email: a.email })).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await f.db.user.delete({ where: { id: a.actor.id } });
    await expect(profiles.search(a.actor, { q: "Same" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  } finally {
    await f.close();
  }
});
