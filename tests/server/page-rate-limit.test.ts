import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

function page(
  path = "/en/play",
  options: { client?: string; method?: string; headers?: Record<string, string> } = {},
) {
  return new Request(`https://localhost:8443${path}`, {
    method: options.method ?? "GET",
    headers: {
      "X-Taskboard-Client-IP": options.client ?? "127.0.0.1",
      ...options.headers,
    },
  });
}

async function fixture() {
  const { db, close } = await createTestDb();
  cleanup.push(close);
  const { createRateLimiter } = await import("@/backend/common/security/rate-limit");
  const { createPageRateLimit } = await import("@/backend/common/security/page-rate-limit");
  let time = Date.parse("2026-10-31T00:00:05Z");
  const now = () => new Date(time);
  const consume = createRateLimiter(db, now);
  return {
    check: createPageRateLimit(consume),
    consume,
    anotherCheck: () => createPageRateLimit(createRateLimiter(db, now)),
    advance: (milliseconds: number) => {
      time += milliseconds;
    },
  };
}

test("rapid document refreshes return 429 with a retry delay and recover at window expiry", async () => {
  const { check, advance } = await fixture();
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();

  const blocked = await check(page());
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("Retry-After")).toBe("5");
  expect(blocked?.headers.get("Cache-Control")).toContain("private");
  expect(blocked?.headers.get("Cache-Control")).toContain("no-store");
  expect(blocked?.headers.get("Content-Type")).toMatch(/^text\/plain;\s*charset=utf-8$/i);
  expect(await blocked!.text()).toContain("5");

  advance(4001);
  const stillBlocked = await check(page());
  expect(stillBlocked?.status).toBe(429);
  expect(stillBlocked?.headers.get("Retry-After")).toBe("1");
  advance(999);
  expect(await check(page())).toBeNull();
});

test("one client's refresh burst does not exhaust another client's allowance", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  expect((await check(page()))?.status).toBe(429);
  for (let index = 0; index < 30; index++)
    expect(await check(page("/en/play", { client: "192.0.2.24" }))).toBeNull();
  expect((await check(page("/en/play", { client: "192.0.2.24" })))?.status).toBe(429);
});

test("changing routes, language, query strings, cookies or user agents cannot reset the page quota", async () => {
  const { check } = await fixture();
  const paths = [
    "/en/play",
    "/fr/account",
    "/ar/games/example",
    "/unknown-route",
    "/en/unknown.css",
    "/apiary",
    "/_nextdoor",
    "/fonts-extra",
  ];
  for (let index = 0; index < 30; index++) {
    expect(
      await check(
        page(`${paths[index % paths.length]}?refresh=${index}`, {
          headers: { Cookie: `visitor=${index}`, "User-Agent": `refresh-client-${index}` },
        }),
      ),
    ).toBeNull();
  }
  expect((await check(page("/fr/another-unknown-route?refresh=31")))?.status).toBe(429);
});

test("untrusted forwarding headers cannot change the Caddy client identity", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++) {
    expect(
      await check(
        page("/en/play", {
          headers: {
            "X-Forwarded-For": `192.0.2.${index + 1}`,
            "X-Real-IP": `198.51.100.${index + 1}`,
            Forwarded: `for=203.0.113.${index + 1}`,
          },
        }),
      ),
    ).toBeNull();
  }
  expect(
    (await check(page("/en/play", { headers: { "X-Forwarded-For": "192.0.2.200" } })))?.status,
  ).toBe(429);
});

test("concurrent refreshes across limiter instances admit only 30 documents", async () => {
  const { check, anotherCheck } = await fixture();
  const other = anotherCheck();
  const results = await Promise.all(
    Array.from({ length: 45 }, (_, index) => (index % 2 ? check : other)(page())),
  );
  expect(results.filter((result) => result === null)).toHaveLength(30);
  const blocked = results.filter((result) => result !== null);
  expect(blocked).toHaveLength(15);
  for (const response of blocked) {
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
  }
});

test("RSC and automatic prefetch requests have a finite shared aggregate allowance", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 120; index++) {
    expect(
      await check(
        page(`/en/play?_rsc=${index}`, {
          headers: { "X-Taskboard-Page-RSC": "1", "Next-Router-Prefetch": "1" },
        }),
      ),
    ).toBeNull();
  }
  const blocked = await check(page("/fr/play", { headers: { "X-Taskboard-Page-RSC": "1" } }));
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("Retry-After")).toBe("5");
  expect((await check(page("/en/play")))?.status).toBe(429);
});

test("ordinary document allowance remains available after automatic prefetches", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 90; index++)
    expect(
      await check(page("/en/friends", { headers: { "X-Taskboard-Page-RSC": "1" } })),
    ).toBeNull();
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  expect((await check(page()))?.status).toBe(429);
});

test("forwarded RSC classification after document requests cannot bypass the aggregate limit", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  for (let index = 0; index < 90; index++)
    expect(await check(page("/en/play", { headers: { "X-Taskboard-Page-RSC": "1" } }))).toBeNull();
  expect(
    (await check(page("/en/play", { headers: { "X-Taskboard-Page-RSC": "1" } })))?.status,
  ).toBe(429);
});

test("a raw RSC header without Caddy's forwarded marker cannot bypass the document quota", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  const blocked = await check(
    page("/en/play", { headers: { RSC: "1", "Next-Router-Prefetch": "1" } }),
  );
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("Retry-After")).toBe("5");
});

test("assets, API requests, SSE and health checks do not consume page allowance", async () => {
  const { check } = await fixture();
  const excluded = [
    "/api",
    "/api/health",
    "/api/games/example/events",
    "/_next",
    "/_next/static/chunk.js",
    "/_next/image?url=avatar.png",
    "/fonts",
    "/fonts/example.woff2",
    "/favicon.ico",
    "/icon.svg",
    "/robots.txt",
    "/sitemap.xml",
    "/default-avatar.svg",
  ];
  for (let index = 0; index < 3; index++) {
    for (const path of excluded) {
      expect(await check(page(path))).toBeNull();
      expect(await check(page(path, { method: "HEAD" }))).toBeNull();
    }
  }
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  expect((await check(page()))?.status).toBe(429);
});

test("non-read methods bypass the page limiter without spending document allowance", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 7; index++) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      expect(await check(page("/en/play", { method }))).toBeNull();
  }
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  expect((await check(page()))?.status).toBe(429);
});

test("HEAD requests share the document quota and limited HEAD responses have no body", async () => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++)
    expect(await check(page("/en/play", { method: "HEAD" }))).toBeNull();
  const blocked = await check(page("/en/play", { method: "HEAD" }));
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("Retry-After")).toBe("5");
  expect(await blocked!.text()).toBe("");
  expect((await check(page()))?.status).toBe(429);
});

test.each([
  ["/en/play", "en"],
  ["/fr/play", "fr"],
  ["/ar/play", "ar"],
  ["/unknown/play", "en"],
])("limited page %s identifies its response language as %s", async (path, language) => {
  const { check } = await fixture();
  for (let index = 0; index < 30; index++) expect(await check(page(path))).toBeNull();
  const blocked = await check(page(path));
  expect(blocked?.status).toBe(429);
  expect(blocked?.headers.get("Content-Language")).toBe(language);
  expect(await blocked!.text()).toMatch(/\S/);
});

test("page refreshes and existing authentication actions use independent quotas", async () => {
  const { check, consume } = await fixture();
  for (let index = 0; index < 10; index++)
    expect((await consume("login-client", "127.0.0.1", 10, 900)).allowed).toBe(true);
  expect((await consume("login-client", "127.0.0.1", 10, 900)).allowed).toBe(false);
  for (let index = 0; index < 30; index++) expect(await check(page())).toBeNull();
  expect((await check(page()))?.status).toBe(429);
  expect((await consume("login-client", "127.0.0.1", 10, 900)).allowed).toBe(false);
});
