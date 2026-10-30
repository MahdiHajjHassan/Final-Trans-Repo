import { expect, test } from "vitest";
import { decodeResponse } from "@/frontend/lib/api/http";

test("the browser receives the server's resend wait without exposing its response body", async () => {
  const response = Response.json(
    { error: { code: "RATE_LIMITED" } },
    { status: 429, headers: { "Retry-After": "58" } },
  );
  await expect(decodeResponse(response)).rejects.toMatchObject({
    code: "RATE_LIMITED",
    retryAfterSeconds: 58,
  });
});

test.each(["invalid", "-1", "999999999999999"])(
  "an invalid retry delay %s cannot set the browser countdown",
  async (value) => {
    const response = Response.json(
      { error: { code: "RATE_LIMITED" } },
      { status: 429, headers: { "Retry-After": value } },
    );
    await expect(decodeResponse(response)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfterSeconds: undefined,
    });
  },
);
