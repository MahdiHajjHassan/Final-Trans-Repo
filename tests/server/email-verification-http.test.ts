import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/backend/modules/auth/auth.service";
import { createAuthHandlers } from "@/backend/modules/auth/auth.controller";
import { createVerificationService } from "@/backend/modules/auth/email/verification.service";
import type { VerificationMessage } from "@/backend/modules/auth/email/verification-mail";
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
const input = {
  email: "new@example.test",
  displayName: "New member",
  password: "correct-password-for-tests",
};
async function fixture() {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const sent: VerificationMessage[] = [];
  const verification = createVerificationService(db, {
    send: async (message) => {
      sent.push(message);
    },
  });
  const auth = createAuthService(db, { verification });
  return { db, sent, auth, handlers: createAuthHandlers(auth, { appOrigin: "https://localhost" }) };
}
function req(
  path: string,
  data: unknown = {},
  cookie?: string,
  method = "POST",
  origin = "https://localhost",
) {
  return new Request(`https://localhost${path}`, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Taskboard-Client-IP": "127.0.0.1",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(data) }),
  });
}
test("registration uses a verification-only cookie and JSON never exposes its secret or code", async () => {
  const f = await fixture();
  const response = await f.handlers.register(req("/api/auth/register", input));
  expect(response.status).toBe(202);
  const cookie = response.headers.get("Set-Cookie")!;
  expect(cookie).toMatch(/^__Host-taskboard_verification=[a-f0-9]{64};/);
  for (const flag of ["Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=3600"])
    expect(cookie).toContain(flag);
  const body = await response.text();
  expect(JSON.parse(body)).toEqual({ data: { verificationRequired: true } });
  expect(body).not.toContain(f.sent[0].code);
  expect(body).not.toContain(input.password);
  expect(body).not.toContain(cookie.split(";")[0].split("=")[1]);
  expect((await f.handlers.account(req("/api/account", {}, cookie, "GET"))).status).toBe(401);
  expect(await f.db.user.count()).toBe(0);
});
test("confirmation clears pending cookie but only later password login creates a full session", async () => {
  const f = await fixture();
  const first = await f.handlers.register(req("/api/auth/register", input));
  const cookie = first.headers.get("Set-Cookie")!.split(";")[0];
  const view = await f.handlers.verificationRead(req("/api/auth/verification", {}, cookie, "GET"));
  expect(view.status).toBe(200);
  expect(await view.json()).toMatchObject({ data: { email: input.email, status: "SENT" } });
  const confirmed = await f.handlers.verificationConfirm(
    req("/api/auth/verification/confirm", { code: f.sent[0].code }, cookie),
  );
  expect(confirmed.status).toBe(200);
  expect(confirmed.headers.get("Set-Cookie")).toContain("Max-Age=0");
  expect((await f.handlers.account(req("/api/account", {}, cookie, "GET"))).status).toBe(401);
  const signed = await f.handlers.login(
    req("/api/auth/login", { email: input.email, password: input.password }),
  );
  expect(signed.status).toBe(200);
  expect(signed.headers.get("Set-Cookie")).toMatch(/^__Host-taskboard_session=/);
});
test("unverified correct-password login starts verification without granting a session", async () => {
  const f = await fixture();
  const user = await seedUser(f.db, { verified: false });
  const response = await f.handlers.login(
    req("/api/auth/login", { email: user.email, password: user.password }),
  );
  expect(response.status).toBe(202);
  expect(response.headers.get("Set-Cookie")).toMatch(/^__Host-taskboard_verification=/);
  expect(await f.db.session.count()).toBe(0);
});
test("verification mutations reject foreign origin, malformed input, and duplicate cookies", async () => {
  const f = await fixture();
  const first = await f.handlers.register(req("/api/auth/register", input));
  const cookie = first.headers.get("Set-Cookie")!.split(";")[0];
  expect(
    (
      await f.handlers.verificationConfirm(
        req(
          "/api/auth/verification/confirm",
          { code: f.sent[0].code },
          cookie,
          "POST",
          "https://attacker.test",
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await f.handlers.verificationResend(
        req("/api/auth/verification/resend", {}, cookie, "POST", "https://attacker.test"),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await f.handlers.verificationConfirm(
        req("/api/auth/verification/confirm", { code: "12x" }, cookie),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await f.handlers.verificationConfirm(
        req("/api/auth/verification/confirm", { code: f.sent[0].code }, `${cookie}; ${cookie}`),
      )
    ).status,
  ).toBe(400);
  expect(await f.db.user.count()).toBe(0);
});
