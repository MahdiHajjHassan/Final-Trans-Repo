import { expect, test } from "vitest";

test("write conflicts are retried to a bounded successful result", async () => {
  const { withWriteRetry } = await import("@/server/db-write");
  let attempts = 0;
  const result = await withWriteRetry(async () => {
    attempts++;
    if (attempts < 3) throw Object.assign(new Error("conflict"), { code: "P2034" });
    return "saved";
  });
  expect(result).toBe("saved");
  expect(attempts).toBe(3);
});

test("persistent SQLite busy errors become a retryable conflict after three attempts", async () => {
  const { withWriteRetry } = await import("@/server/db-write");
  let attempts = 0;
  await expect(
    withWriteRetry(async () => {
      attempts++;
      throw Object.assign(new Error("busy"), { cause: { originalCode: "SQLITE_BUSY_SNAPSHOT" } });
    }),
  ).rejects.toMatchObject({ code: "CONFLICT", fields: { database: ["busy"] } });
  expect(attempts).toBe(3);
});

test("validation and unrelated failures are not retried or hidden", async () => {
  const { withWriteRetry } = await import("@/server/db-write");
  const failure = new Error("not a database conflict");
  let attempts = 0;
  await expect(
    withWriteRetry(async () => {
      attempts++;
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(attempts).toBe(1);
});
