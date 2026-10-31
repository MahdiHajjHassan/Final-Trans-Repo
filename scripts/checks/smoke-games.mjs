import assert from "node:assert/strict";
import { call, login } from "../lib/http.mjs";
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error("Private administrator settings missing");
if (!process.env.SMOKE_MEMBER_EMAIL || !process.env.SMOKE_MEMBER_PASSWORD)
  throw new Error(
    "Set private SMOKE_MEMBER_EMAIL and SMOKE_MEMBER_PASSWORD for a separate, already verified account",
  );
let admin, member;
try {
  admin = await login({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  member = await login({
    email: process.env.SMOKE_MEMBER_EMAIL,
    password: process.env.SMOKE_MEMBER_PASSWORD,
  });
  assert.notEqual(
    admin.account.id,
    member.account.id,
    "Game smoke requires two distinct verified accounts",
  );
  const room = await call("/api/games", {
    method: "POST",
    cookie: admin.cookie,
    body: { mode: "HUMAN" },
  });
  assert.equal(room.status, 201);
  const joined = await call("/api/games/join", {
    method: "POST",
    cookie: member.cookie,
    body: { code: room.data.inviteCode },
  });
  assert.equal(joined.status, 200);
  let game = joined.data.game;
  assert.equal((await call("/api/games/" + game.id)).status, 401);
  for (const [index, cell] of [0, 3, 1, 4, 2].entries()) {
    const moved = await call("/api/games/" + game.id + "/moves", {
      method: "POST",
      cookie: index % 2 === 0 ? admin.cookie : member.cookie,
      body: { cell, expectedVersion: game.version },
    });
    assert.equal(moved.status, 200);
    game = moved.data;
  }
  assert.equal(game.winner, "X");
  assert.equal(game.status, "FINISHED");
  const ai = await call("/api/games", {
    method: "POST",
    cookie: admin.cookie,
    body: { mode: "AI" },
  });
  assert.equal(ai.status, 201);
  const moved = await call("/api/games/" + ai.data.game.id + "/moves", {
    method: "POST",
    cookie: admin.cookie,
    body: { cell: 0, expectedVersion: 1 },
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.version, 3);
  assert.equal(moved.data.cells.filter((c) => c === "X").length, 1);
  assert.equal(moved.data.cells.filter((c) => c === "O").length, 1);
  assert.equal(
    (
      await call("/api/games/" + ai.data.game.id + "/moves", {
        method: "POST",
        cookie: admin.cookie,
        body: { cell: 1, expectedVersion: 1 },
      })
    ).status,
    409,
  );
  assert.equal(
    (await call("/api/games/" + ai.data.game.id, { cookie: member.cookie })).status,
    403,
  );
  const resigned = await call("/api/games/" + ai.data.game.id + "/resign", {
    method: "POST",
    cookie: admin.cookie,
    body: { expectedVersion: 3 },
  });
  assert.equal(resigned.status, 200);
  assert.equal(resigned.data.winner, "O");
  const waiting = await call("/api/games", {
    method: "POST",
    cookie: admin.cookie,
    body: { mode: "HUMAN" },
  });
  const cancelled = await call("/api/games/" + waiting.data.game.id + "/cancel", {
    method: "POST",
    cookie: admin.cookie,
    body: { expectedVersion: 1 },
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, "CANCELLED");
  console.log(
    "Verified trusted-HTTPS friend win, AI reply, stale-move and access rejection, resignation and cancellation. Credentials omitted.",
  );
} finally {
  for (const session of [member, admin])
    if (session)
      await call("/api/auth/logout", { method: "POST", cookie: session.cookie, body: {} });
}
