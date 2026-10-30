import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { createVerificationService } from "@/backend/modules/auth/email/verification.service";
import type {
  VerificationMessage,
  VerificationSender,
} from "@/backend/modules/auth/email/verification-mail";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
const signup = {
  email: "boundary@example.test",
  displayName: "Boundary",
  password: "a-disposable-test-password",
};

async function fixture(sender?: VerificationSender) {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  let time = new Date("2026-10-30T10:00:59Z");
  const sent: VerificationMessage[] = [];
  const options = {
    now: () => time,
    send: async (message: VerificationMessage) => {
      sent.push(message);
      await sender?.(message);
    },
  };
  return {
    db,
    sent,
    service: createVerificationService(db, options),
    another: () => createVerificationService(db, options),
    advance: (ms: number) => {
      time = new Date(time.getTime() + ms);
    },
  };
}

test.each(["resend", "new attempt"])(
  "the full address cooldown survives a clock-minute boundary for %s",
  async (action) => {
    const f = await fixture(),
      p = await f.service.startSignup(signup, "first");
    f.advance(2000);
    const attempt =
      action === "resend"
        ? f.service.resend(p.token, "second")
        : f.another().startSignup(signup, "second");
    await expect(attempt).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterSeconds: 58 });
    expect(f.sent).toHaveLength(1);
    f.advance(58000);
    await f.service.resend(p.token, "third");
    expect(f.sent).toHaveLength(2);
  },
);

test("concurrent new attempts and resends share one persistent address cooldown", async () => {
  const f = await fixture(),
    p = await f.service.startSignup(signup, "first");
  f.advance(60000);
  const attempts = await Promise.allSettled([
    f.service.resend(p.token, "resend"),
    f.another().startSignup(signup, "new"),
  ]);
  expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(f.sent).toHaveLength(2);
  const rejected = attempts.find((item) => item.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ code: "RATE_LIMITED" });
});

test("requests rejected by the cooldown do not consume the hourly sending allowance", async () => {
  const f = await fixture(),
    p = await f.service.startSignup(signup, "first");
  f.advance(2000);
  for (let i = 0; i < 4; i++)
    await expect(f.service.resend(p.token, `early-${i}`)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  f.advance(58000);
  await f.service.resend(p.token, "after-cooldown");
  expect(f.sent).toHaveLength(2);
});

test("late failed SMTP completion cannot deactivate a newer successfully sent generation", async () => {
  let failOld!: () => void, started!: () => void;
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  let count = 0;
  const f = await fixture(async () => {
    if (++count === 2) {
      started();
      await new Promise<void>((_, reject) => {
        failOld = () => reject(new Error("simulated timeout"));
      });
    }
  });
  const p = await f.service.startSignup(signup, "first");
  f.advance(61000);
  const old = f.service.resend(p.token, "second");
  await sending;
  f.advance(61000);
  await f.service.resend(p.token, "third");
  failOld();
  await old;
  expect((await f.service.read(p.token)).status).toBe("SENT");
  await expect(f.service.confirm(p.token, f.sent[1].code, "guess")).rejects.toMatchObject({
    code: "INVALID_CODE",
  });
  await f.service.confirm(p.token, f.sent[2].code, "guess");
});

test("resend cannot extend the one-hour lifetime of a pending attempt", async () => {
  const f = await fixture(),
    p = await f.service.startSignup(signup, "first");
  f.advance(3600000);
  await expect(f.service.resend(p.token, "late")).rejects.toMatchObject({ code: "INVALID_CODE" });
  expect(f.sent).toHaveLength(1);
});

test("safe metadata supplies the server clock for a stable browser countdown", async () => {
  const f = await fixture(),
    p = await f.service.startSignup(signup, "first");
  expect(await f.service.read(p.token)).toEqual({
    email: signup.email,
    status: "SENT",
    serverNow: "2026-10-30T10:00:59.000Z",
    expiresAt: "2026-10-30T10:10:59.000Z",
    resendAt: "2026-10-30T10:01:59.000Z",
  });
});
