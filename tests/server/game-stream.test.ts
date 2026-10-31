import { expect, test, vi } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createSessionToken } from "@/backend/modules/auth/sessions.service";
import { sessionCookieName } from "@/backend/modules/auth/session.guard";
import { createGameService } from "@/backend/modules/games/games.service";
import { createGameEvents } from "@/backend/modules/realtime/game-events";
import { createGameStream } from "@/backend/modules/realtime/game-stream";
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
    const { createUserService } = await import("@/backend/modules/users/users.service");
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

test("heartbeats deliver current self-service and admin names without changing a finished board version", async () => {
  const f = await createTestDb(),
    abort = new AbortController();
  try {
    const a = await seedUser(f.db, { displayName: "Original name" }),
      admin = await seedUser(f.db, { role: "ADMIN" }),
      auth = createAuthService(f.db),
      events = createGameEvents(),
      games = createGameService(f.db, { publish: events.publish });
    const room = await games.create(a.actor, { mode: "AI" });
    const finished = await games.resign(a.actor, room.game.id, {
      expectedVersion: room.game.version,
    });
    const session = await createSessionToken(f.db, a.actor.id, new Date());
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const response = await createGameStream(
      new Request("https://localhost", {
        headers: { Cookie: sessionCookieName + "=" + session.token },
        signal: abort.signal,
      }),
      room.game.id,
      { auth, games, events },
    );
    const reader = response.body!.getReader(),
      decode = new TextDecoder();
    const snapshot = async () => decode.decode((await reader.read()).value);
    expect(await snapshot()).toContain('"displayName":"Original name"');
    await auth.updateAccount(a.actor, { displayName: "Self updated" });
    const fresh = await games.read(a.actor, room.game.id);
    expect(fresh.game.version).toBe(finished.version);
    vi.advanceTimersByTime(15000);
    expect(await snapshot()).toContain('"displayName":"Self updated"');
    const { createUserService } = await import("@/backend/modules/users/users.service");
    await createUserService(f.db).updateUser(admin.actor, a.actor.id, {
      displayName: "Admin updated",
    });
    vi.advanceTimersByTime(15000);
    const changed = await snapshot();
    expect(changed).toContain("event: state");
    expect(changed).toContain('"displayName":"Admin updated"');
    expect(changed).toContain('"version":' + finished.version);
    expect((await games.read(a.actor, room.game.id)).game.cells).toEqual(finished.cells);
    vi.advanceTimersByTime(15000);
    expect(await snapshot()).toBe(": heartbeat\n\n");
    await auth.logout(session.token);
    vi.advanceTimersByTime(15000);
    expect(await snapshot()).toContain("access-lost");
    expect((await reader.read()).done).toBe(true);
  } finally {
    abort.abort();
    vi.useRealTimers();
    await f.close();
  }
});

test("a rename returning to the previous name emits a new metadata revision at the same board version", async () => {
  const f = await createTestDb(),
    abort = new AbortController();
  try {
    const person = await seedUser(f.db, { displayName: "Original" }),
      auth = createAuthService(f.db),
      events = createGameEvents(),
      games = createGameService(f.db, { publish: events.publish });
    const room = await games.create(person.actor, { mode: "AI" });
    const session = await createSessionToken(f.db, person.actor.id, new Date());
    const response = await createGameStream(
      new Request("https://localhost", {
        headers: { Cookie: sessionCookieName + "=" + session.token },
        signal: abort.signal,
      }),
      room.game.id,
      { auth, games, events },
    );
    const reader = response.body!.getReader(),
      decode = new TextDecoder();
    const initial = decode.decode((await reader.read()).value);
    expect(initial).toContain('"displayName":"Original"');
    await auth.updateAccount(person.actor, { displayName: "Intermediate" });
    await auth.updateAccount(person.actor, { displayName: "Original" });
    events.publish(room.game.id, room.game.version);
    const restored = decode.decode((await reader.read()).value);
    expect(restored).toContain("event: state");
    expect(restored).toContain('"displayName":"Original"');
    expect(restored).toContain('"version":1');
    expect(restored).toContain('"playerMetadataVersion":3');
  } finally {
    abort.abort();
    await f.close();
  }
});
