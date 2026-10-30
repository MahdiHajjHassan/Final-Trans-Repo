import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createStatisticsService } from "@/backend/modules/statistics/statistics.service";
import { createStatisticsHandlers } from "@/backend/modules/statistics/statistics.controller";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";

test("statistics HTTP allows own history only, validates filters and emits private no-store DTOs", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      s = await createSessionToken(f.db, a.actor.id, new Date()),
      h = createStatisticsHandlers(createStatisticsService(f.db), createAuthService(f.db));
    const headers = { cookie: `${sessionCookieName}=${s.token}` };
    expect((await h.summary(new Request("https://localhost/"))).status).toBe(401);
    expect(
      (await h.history(new Request("https://localhost/?userId=other", { headers }))).status,
    ).toBe(400);
    expect(
      (await h.history(new Request("https://localhost/?page=1&page=2", { headers }))).status,
    ).toBe(400);
    expect(
      (await h.summary(new Request("https://localhost/?role=ADMIN", { headers }))).status,
    ).toBe(400);
    const response = await h.summary(new Request("https://localhost/", { headers }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).data.points).toBe(0);
  } finally {
    await f.close();
  }
});
