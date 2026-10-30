import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createSessionToken, revokeSessionToken } from "@/backend/modules/auth/sessions.service";
import { createPresenceService } from "@/backend/modules/presence/presence.service";
import { createFriendService } from "@/backend/modules/friends/friends.service";

test("presence follows current sessions and the exact cutoff without leaking to pending strangers", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    let time = new Date("2026-10-30T12:00:00Z");
    const now = () => time,
      friends = createFriendService(f.db, { now }),
      presence = createPresenceService(f.db, { now });
    const req = await friends.request(a.actor, b.actor.id);
    await friends.accept(b.actor, req.id);
    const one = await createSessionToken(f.db, b.actor.id, time);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(true);
    time = new Date(time.getTime() + 60000);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(true);
    time = new Date(time.getTime() + 1000);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(false);
    await presence.heartbeat(one.token);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(true);
    const two = await createSessionToken(f.db, b.actor.id, time);
    await revokeSessionToken(f.db, one.token);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(true);
    await expect(presence.heartbeat(one.token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await revokeSessionToken(f.db, two.token);
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(false);
    await expect(presence.heartbeat("bad")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    const expired = await createSessionToken(
      f.db,
      b.actor.id,
      new Date(time.getTime() - 8 * 86400000),
    );
    await expect(presence.heartbeat(expired.token)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    const live = await createSessionToken(f.db, b.actor.id, time);
    await f.db.session.updateMany({ where: { userId: b.actor.id }, data: { lastSeenAt: null } });
    expect((await friends.relationship(a.actor, b.actor.id)).online).toBe(false);
    for (let i = 0; i < 30; i++) await presence.heartbeat(live.token);
    await expect(presence.heartbeat(live.token)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await f.db.user.delete({ where: { id: b.actor.id } });
    await expect(presence.heartbeat(live.token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  } finally {
    await f.close();
  }
});
