import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createDb } from "@/backend/database/db";
import { createFriendService } from "@/backend/modules/friends/friends.service";

test("opposite concurrent requests stay one pending pair and only recipient accepts", async () => {
  const f = await createTestDb(),
    second = await createDb(f.url);
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      c = await seedUser(f.db);
    const one = createFriendService(f.db),
      two = createFriendService(second);
    await Promise.all([one.request(a.actor, b.actor.id), two.request(b.actor, a.actor.id)]);
    expect(await f.db.friendship.count()).toBe(1);
    const row = await f.db.friendship.findFirstOrThrow();
    expect(row.status).toBe("PENDING");
    const sender = row.requestedById === a.actor.id ? a : b,
      recipient = sender === a ? b : a;
    await expect(one.accept(sender.actor, row.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(one.accept(c.actor, row.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await one.list(sender.actor, { kind: "outgoing" })).items[0].online).toBeNull();
    await one.accept(recipient.actor, row.id);
    expect((await one.list(a.actor, { kind: "accepted" })).total).toBe(1);
    expect(await one.relationship(a.actor, b.actor.id)).toMatchObject({
      relationship: "FRIEND",
      online: false,
    });
    await expect(one.remove(c.actor, row.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await one.remove(a.actor, row.id);
    expect((await one.list(b.actor, { kind: "accepted" })).total).toBe(0);
    await expect(one.accept(recipient.actor, row.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(one.request(a.actor, a.actor.id)).rejects.toMatchObject({ code: "CONFLICT" });
    const again = await one.request(a.actor, b.actor.id);
    await one.remove(b.actor, again.id);
    const pending = await one.request(b.actor, a.actor.id);
    await one.remove(b.actor, pending.id);
    await one.request(a.actor, b.actor.id);
    await f.db.user.delete({ where: { id: b.actor.id } });
    expect(await f.db.friendship.count()).toBe(0);
  } finally {
    await second.$disconnect();
    await f.close();
  }
});
