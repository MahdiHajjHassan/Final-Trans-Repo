import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createTournamentService } from "@/backend/modules/tournaments/tournaments.service";
import { createTournamentHandlers } from "@/backend/modules/tournaments/tournaments.controller";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";

test("tournament HTTP protects mutations and hides invitation codes from non-hosts", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      s = await createSessionToken(f.db, a.actor.id, new Date());
    const h = createTournamentHandlers(createTournamentService(f.db), createAuthService(f.db), {
      appOrigin: "https://localhost",
    });
    const headers = {
      cookie: `${sessionCookieName}=${s.token}`,
      origin: "https://localhost",
      "content-type": "application/json",
    };
    expect((await h.list(new Request("https://localhost/"))).status).toBe(401);
    expect(
      (await h.list(new Request("https://localhost/?page=1&page=2", { headers }))).status,
    ).toBe(400);
    expect(
      (
        await h.create(
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
        await h.create(
          new Request("https://localhost/", { method: "POST", headers, body: '{"winner":"X"}' }),
        )
      ).status,
    ).toBe(400);
    for (let i = 0; i < 5; i++)
      expect(
        (await h.create(new Request("https://localhost/", { method: "POST", headers, body: "{}" })))
          .status,
      ).toBe(201);
    expect(
      (await h.create(new Request("https://localhost/", { method: "POST", headers, body: "{}" })))
        .status,
    ).toBe(429);
  } finally {
    await f.close();
  }
});
