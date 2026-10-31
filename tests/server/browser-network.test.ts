import type { Browser } from "@playwright/test";
import { expect, test } from "vitest";
import { settleBrowserNetwork } from "../helpers/browser-network";

function browserWith(results: Array<number | Error>) {
  let attempts = 0;
  let closed = false;
  const browser = {
    newContext: async () => ({
      newPage: async () => ({
        goto: async () => {
          const result = results[attempts++] ?? 200;
          if (result instanceof Error) throw result;
          return { status: () => result };
        },
      }),
      close: async () => {
        closed = true;
      },
    }),
  } as unknown as Browser;
  return { browser, attempts: () => attempts, closed: () => closed };
}

test("network stabilization requires consecutive healthy probes after a bridge change", async () => {
  const probe = browserWith([200, new Error("net::ERR_NETWORK_CHANGED"), 200, 200, 200]);
  await settleBrowserNetwork(probe.browser, "https://localhost:8443");
  expect(probe.attempts()).toBe(5);
  expect(probe.closed()).toBe(true);
});

test("network stabilization preserves unexpected network errors", async () => {
  const failure = new Error("net::ERR_CERT_AUTHORITY_INVALID");
  const probe = browserWith([failure]);
  await expect(settleBrowserNetwork(probe.browser, "https://localhost:8443")).rejects.toBe(failure);
  expect(probe.attempts()).toBe(1);
  expect(probe.closed()).toBe(true);
});

test("network stabilization refuses unhealthy application responses without retrying", async () => {
  const probe = browserWith([429]);
  await expect(settleBrowserNetwork(probe.browser, "https://localhost:8443")).rejects.toThrow();
  expect(probe.attempts()).toBe(1);
  expect(probe.closed()).toBe(true);
});

test("persistent network changes fail within a bounded probe budget", async () => {
  const probe = browserWith(Array.from({ length: 6 }, () => new Error("net::ERR_NETWORK_CHANGED")));
  await expect(settleBrowserNetwork(probe.browser, "https://localhost:8443")).rejects.toThrow();
  expect(probe.attempts()).toBe(6);
  expect(probe.closed()).toBe(true);
});
