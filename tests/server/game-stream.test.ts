import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/server/auth/service";
import { createSessionToken } from "@/server/auth/session";
import { sessionCookieName } from "@/server/auth/policy";
import { createGameService } from "@/server/games/service";
import { createGameEvents } from "@/server/games/events";
import { createGameStream } from "@/server/games/stream";
test("streams send canonical snapshots, scope updates, enforce revocation and release limits on abort", async () => {
  const f = await createTestDb();
  const aborts: AbortController[] = [];
  try {
    const a = await seedUser(f.db),
      auth = createAuthService(f.db),
      events = createGameEvents();
    const games = createGameService(f.db, { publish: events.publish });
    const room = await games.create(a.actor, { mode: "AI" });
    const other = await games.create(a.actor, { mode: "AI" });
    const session = await createSessionToken(f.db, a.actor.id, new Date());
    const request = () => {
      const controller = new AbortController();
      aborts.push(controller);
      return new Request("https://localhost/api/games/" + room.game.id + "/events", {
        headers: { Cookie: sessionCookieName + "=" + session.token },
        signal: controller.signal,
      });
    };
    const response = await createGameStream(request(), room.game.id, { auth, games, events });
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const reader = response.body!.getReader(),
      decode = new TextDecoder();
    expect(decode.decode((await reader.read()).value)).toContain('"version":1');
    let received = false;
    const pending = reader.read().then((r) => {
      received = true;
      return r;
    });
    events.publish(other.game.id, 100);
    await new Promise((r) => setTimeout(r, 25));
    expect(received).toBe(false);
    await games.move(a.actor, room.game.id, { cell: 0, expectedVersion: 1 });
    expect(decode.decode((await pending).value)).toContain('"version":3');
    await auth.logout(session.token);
    events.publish(room.game.id, 4);
    expect(decode.decode((await reader.read()).value)).toContain("access-lost");
    expect((await reader.read()).done).toBe(true);
    const fresh = await createSessionToken(f.db, a.actor.id, new Date());
    const more = () => {
      const controller = new AbortController();
      aborts.push(controller);
      return new Request("https://localhost", {
        headers: { Cookie: sessionCookieName + "=" + fresh.token },
        signal: controller.signal,
      });
    };
    for (let n = 0; n < 5; n++) {
      const response = await createGameStream(more(), room.game.id, { auth, games, events });
      const initial = response.body!.getReader();
      await initial.read();
      initial.releaseLock();
    }
    await expect(
      createGameStream(more(), room.game.id, { auth, games, events }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    for (const controller of aborts) controller.abort();
    const again = await createGameStream(more(), room.game.id, { auth, games, events });
    expect(again.status).toBe(200);
    const initial = again.body!.getReader();
    await initial.read();
    initial.releaseLock();
  } finally {
    for (const controller of aborts) controller.abort();
    await f.close();
  }
});

test("deleting an active player revokes their stream and delivers an anonymized terminal snapshot to the opponent", async () => {
  const f = await createTestDb(),
    aborts: AbortController[] = [];
  try {
    const admin = await seedUser(f.db, { role: "ADMIN" }),
      a = await seedUser(f.db),
      b = await seedUser(f.db);
    const auth = createAuthService(f.db),
      events = createGameEvents(),
      games = createGameService(f.db, { publish: events.publish });
    const room = await games.create(a.actor, { mode: "HUMAN" });
    await games.join(b.actor, { code: room.inviteCode });
    const readers = [];
    for (const person of [a, b]) {
      const session = await createSessionToken(f.db, person.actor.id, new Date()),
        controller = new AbortController();
      aborts.push(controller);
      const response = await createGameStream(
        new Request("https://localhost", {
          headers: { Cookie: sessionCookieName + "=" + session.token },
          signal: controller.signal,
        }),
        room.game.id,
        { auth, games, events },
      );
      const reader = response.body!.getReader();
      await reader.read();
      readers.push(reader);
    }
    const { createUserService } = await import("@/server/users/service");
    await createUserService(f.db, { publish: events.publish }).deleteUser(admin.actor, a.actor.id);
    const decode = new TextDecoder();
    expect(decode.decode((await readers[0].read()).value)).toContain("access-lost");
    expect((await readers[0].read()).done).toBe(true);
    const snapshot = decode.decode((await readers[1].read()).value);
    expect(snapshot).toContain('"status":"FINISHED"');
    expect(snapshot).toContain('"kind":"DELETED"');
  } finally {
    for (const controller of aborts) controller.abort();
    await f.close();
  }
});
