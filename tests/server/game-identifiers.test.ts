import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createGameService } from "@/server/games/service";
import { createGameEvents } from "@/server/games/events";
import { createGameStream } from "@/server/games/stream";
import { createAuthService } from "@/server/auth/service";
import { createSessionToken } from "@/server/auth/session";
import { sessionCookieName } from "@/server/auth/policy";

const canonicalId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("valid uppercase game references preserve reads, mutations and participant checks", async () => {
  const fixture = await createTestDb();
  try {
    const owner = await seedUser(fixture.db), stranger = await seedUser(fixture.db);
    const games = createGameService(fixture.db, { random: () => 0 });
    const created = await games.create(owner.actor, { mode: "AI" });
    await fixture.db.game.update({ where: { id: created.game.id }, data: { id: canonicalId } });
    const reference = canonicalId.toUpperCase();
    expect((await games.read(owner.actor, reference)).game.id).toBe(canonicalId);
    await expect(games.read(stranger.actor, reference)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const moved = await games.move(owner.actor, reference, { cell: 0, expectedVersion: 1 });
    expect(moved).toMatchObject({ id: canonicalId, version: 3 });
    expect(await games.resign(owner.actor, reference, { expectedVersion: 3 })).toMatchObject({ id: canonicalId, status: "FINISHED" });
    const waiting = await games.create(owner.actor, { mode: "HUMAN" });
    const waitingId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
    await fixture.db.game.update({ where: { id: waiting.game.id }, data: { id: waitingId } });
    expect(await games.cancel(owner.actor, waitingId.toUpperCase(), { expectedVersion: 1 })).toMatchObject({ id: waitingId, status: "CANCELLED" });
  } finally { await fixture.close(); }
});

test("an uppercase SSE reference receives canonical game updates immediately", async () => {
  const fixture = await createTestDb(), abort = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const owner = await seedUser(fixture.db), events = createGameEvents();
    const games = createGameService(fixture.db, { publish: events.publish });
    const created = await games.create(owner.actor, { mode: "AI" });
    await fixture.db.game.update({ where: { id: created.game.id }, data: { id: canonicalId } });
    const session = await createSessionToken(fixture.db, owner.actor.id, new Date());
    const reference = canonicalId.toUpperCase();
    const request = new Request(`https://localhost/api/games/${reference}/events`, {
      headers: { Cookie: `${sessionCookieName}=${session.token}` }, signal: abort.signal,
    });
    const response = await createGameStream(request, reference, { auth: createAuthService(fixture.db), games, events });
    reader = response.body!.getReader();
    const decode = new TextDecoder();
    expect(decode.decode((await reader.read()).value)).toContain(`"id":"${canonicalId}"`);
    const next = reader.read();
    await games.move(owner.actor, reference, { cell: 0, expectedVersion: 1 });
    const update = await Promise.race([next, new Promise<never>((_, reject) => {
      deadline = setTimeout(() => reject(new Error("Canonical update was not delivered before the heartbeat")), 2000);
    })]);
    expect(decode.decode(update.value)).toContain('"version":3');
  } finally {
    clearTimeout(deadline); abort.abort(); await reader?.cancel(); await fixture.close();
  }
});
