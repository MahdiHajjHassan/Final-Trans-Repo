import { expect, test } from "vitest";
import { loadConfig } from "@/backend/config/env";
const base = {
  APP_ORIGIN: "https://localhost",
  ADMIN_EMAIL: "admin@example.test",
  ADMIN_PASSWORD: "a-long-local-password",
};
test("partial SMTP configuration is rejected instead of silently dropping delivery", () => {
  expect(() => loadConfig({ ...base, SMTP_HOST: "smtp.gmail.com" })).toThrow();
});
test("public SMTP rejects plaintext ports and requires authentication", () => {
  const mail = {
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "465",
    SMTP_USER: "sender@example.test",
    SMTP_PASSWORD: "test-password-not-a-real-credential",
    SMTP_FROM_EMAIL: "sender@example.test",
  };
  expect(() => loadConfig({ ...base, ...mail, SMTP_PORT: "25" })).toThrow();
  expect(() => loadConfig({ ...base, ...mail, SMTP_PASSWORD: "" })).toThrow();
  expect(loadConfig({ ...base, ...mail }).mail).toMatchObject({
    host: "smtp.gmail.com",
    port: 465,
    isolatedTest: false,
  });
});
test("only an explicitly isolated E2E project can use the internal plaintext mailbox", () => {
  const internal = {
    SMTP_HOST: "mailpit",
    SMTP_PORT: "1025",
    SMTP_FROM_EMAIL: "test@example.test",
  };
  expect(() => loadConfig({ ...base, ...internal })).toThrow();
  expect(
    loadConfig({ ...base, ...internal, TICTACTOE_E2E_PROJECT: "tictactoe-e2e-mail" }).mail,
  ).toMatchObject({ host: "mailpit", port: 1025, isolatedTest: true });
});
test("missing mail configuration never silently verifies an address", async () => {
  const { createVerificationSender } =
    await import("@/backend/modules/auth/email/verification-mail");
  await expect(
    createVerificationSender(undefined)({
      email: "recipient@example.test",
      code: "123456",
      locale: "en",
      generation: "generation-1",
    }),
  ).rejects.toMatchObject({ code: "EMAIL_UNAVAILABLE" });
});
test.each(["en", "fr", "ar"] as const)(
  "verification email in %s exposes the code and expiry only in its body",
  async (locale) => {
    const { verificationMessage } = await import("@/backend/modules/auth/email/verification-mail");
    const message = verificationMessage({
      email: "recipient@example.test",
      code: "123456",
      locale,
      generation: "generation-1",
    });
    expect(message.subject).not.toContain("123456");
    expect(message.text).toContain("123456");
    expect(message.text).toContain("10");
    expect(message.text.length).toBeGreaterThan(80);
  },
);

test("an SMTP greeting failure is sanitized and never automatically retried", async () => {
  const { createServer } = await import("node:net");
  const { createVerificationSender } =
    await import("@/backend/modules/auth/email/verification-mail");
  let connections = 0;
  const server = createServer((socket) => {
    connections++;
    socket.end("421 unavailable\r\n");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test listener");
  try {
    const sender = createVerificationSender({
      host: "127.0.0.1",
      port: address.port,
      from: "sender@example.test",
      isolatedTest: true,
    });
    await expect(
      sender({
        email: "recipient@example.test",
        code: "123456",
        locale: "en",
        generation: "generation-1",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_UNAVAILABLE" });
    expect(connections).toBe(1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
