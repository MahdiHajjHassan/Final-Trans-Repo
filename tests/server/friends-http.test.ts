import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createFriendService } from "@/backend/modules/friends/friends.service";
import { createFriendHandlers } from "@/backend/modules/friends/friends.controller";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";

test("friend HTTP rejects missing auth foreign origin extra fields and duplicate query keys", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      s = await createSessionToken(f.db, a.actor.id, new Date());
    const h = createFriendHandlers(createFriendService(f.db), createAuthService(f.db), {
      appOrigin: "https://localhost",
    });
    const headers = {
      cookie: `${sessionCookieName}=${s.token}`,
      origin: "https://localhost",
      "content-type": "application/json",
    };
    expect((await h.list(new Request("https://localhost/api/friends"))).status).toBe(401);
    expect(
      (await h.list(new Request("https://localhost/api/friends?page=1&page=2", { headers })))
        .status,
    ).toBe(400);
    expect(
      (
        await h.request(
          new Request("https://localhost/", {
            method: "POST",
            headers: { ...headers, origin: "https://evil.test" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await h.request(
          new Request("https://localhost/", {
            method: "POST",
            headers,
            body: JSON.stringify({ userId: a.actor.id, role: "ADMIN" }),
          }),
        )
      ).status,
    ).toBe(400);
  } finally {
    await f.close();
  }
});
