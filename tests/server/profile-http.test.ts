import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createProfileHandlers } from "@/backend/modules/profiles/profiles.controller";
import { createProfileService } from "@/backend/modules/profiles/profiles.service";
import { createFriendService } from "@/backend/modules/friends/friends.service";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";

test("profile HTTP composes only public data and rejects ambiguous discovery queries", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      b = await seedUser(f.db),
      s = await createSessionToken(f.db, a.actor.id, new Date());
    const h = createProfileHandlers(
      createProfileService(f.db),
      createFriendService(f.db),
      createAuthService(f.db),
    );
    const headers = { cookie: `${sessionCookieName}=${s.token}` };
    const response = await h.read(new Request("https://localhost/", { headers }), b.actor.id);
    const data = (await response.json()).data;
    expect(data).toMatchObject({ id: b.actor.id, relationship: "NONE", online: null });
    expect(JSON.stringify(data)).not.toContain(b.email);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await h.search(new Request("https://localhost/?q=ab&q=cd", { headers }))).status).toBe(
      400,
    );
  } finally {
    await f.close();
  }
});
