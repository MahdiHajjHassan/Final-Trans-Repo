import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { setAccountEmail } from "@/backend/modules/auth/email/change-email";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createProfileService } from "@/backend/modules/profiles/profiles.service";
import { createAvatarService } from "@/backend/modules/profiles/avatar.service";
import { createFriendService } from "@/backend/modules/friends/friends.service";
import { createPresenceService, onlineAt } from "@/backend/modules/presence/presence.service";
import { createTournamentService } from "@/backend/modules/tournaments/tournaments.service";
import { createStatisticsService } from "@/backend/modules/statistics/statistics.service";

// The new modules must keep the production email gate even for an already-resolved actor.
test("email correction revokes every member module until mailbox ownership is proved again", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db);
    const session = await createSessionToken(f.db, a.actor.id, new Date());
    const profiles = createProfileService(f.db),
      avatars = createAvatarService(f.db),
      friends = createFriendService(f.db),
      presence = createPresenceService(f.db),
      tournaments = createTournamentService(f.db),
      statistics = createStatisticsService(f.db);
    const friendship = await friends.request(a.actor, b.actor.id);
    await friends.accept(b.actor, friendship.id);
    expect(await onlineAt(f.db, a.actor.id, new Date())).toBe(true);
    await setAccountEmail(f.db, a.email, "corrected@example.test");
    expect(await createAuthService(f.db).resolveSession(session.token)).toBeNull();
    const operations = [
      () => profiles.read(a.actor, b.actor.id),
      () => profiles.search(a.actor, { q: "Test" }),
      () => avatars.read(a.actor, a.actor.id),
      () => avatars.remove(a.actor),
      () => friends.list(a.actor),
      () => friends.request(a.actor, b.actor.id),
      () => presence.heartbeat(session.token),
      () => tournaments.create(a.actor, {}),
      () => statistics.summary(a.actor),
      () => statistics.history(a.actor),
      () => statistics.leaderboard(a.actor),
    ];
    for (const operation of operations)
      await expect(operation()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await onlineAt(f.db, a.actor.id, new Date())).toBe(false);
    expect(await f.db.tournament.count()).toBe(0);
    expect(await f.db.friendship.count()).toBe(1);
  } finally {
    await f.close();
  }
});
