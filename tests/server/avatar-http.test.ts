import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAvatarService } from "@/backend/modules/profiles/avatar.service";
import { createAvatarHandlers } from "@/backend/modules/profiles/avatar.controller";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import { readBytes } from "@/backend/common/security/read-bytes";

test("avatar HTTP requires current auth/origin and sends only safe image headers", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      session = await createSessionToken(f.db, a.actor.id, new Date());
    const handlers = createAvatarHandlers(createAvatarService(f.db), createAuthService(f.db), {
      appOrigin: "https://localhost",
    });
    const headers = { cookie: `${sessionCookieName}=${session.token}` };
    expect(
      (await handlers.read(new Request("https://localhost/api/profiles/x/avatar"), a.actor.id))
        .status,
    ).toBe(401);
    const image = await handlers.read(new Request("https://localhost/", { headers }), a.actor.id);
    expect(image.status).toBe(200);
    expect(image.headers.get("x-content-type-options")).toBe("nosniff");
    expect(image.headers.get("cache-control")).toBe("private, no-store");
    const bad = await handlers.put(
      new Request("https://localhost/", {
        method: "PUT",
        headers: { ...headers, origin: "https://evil.test", "content-type": "image/png" },
        body: "bad",
      }),
    );
    expect(bad.status).toBe(403);
  } finally {
    await f.close();
  }
});
test("bounded reader counts bytes even with missing or false Content-Length", async () => {
  for (const headers of [new Headers(), new Headers({ "content-length": "1" })]) {
    await expect(
      readBytes(
        new Request("https://localhost/", { method: "PUT", headers, body: new Uint8Array(11) }),
        10,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  }
});
