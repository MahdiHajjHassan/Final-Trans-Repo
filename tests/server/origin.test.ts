import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const { db, close } = await createTestDb(); cleanup.push(close);
  const { createAuthService } = await import("@/server/auth/service");
  const { createAuthHandlers } = await import("@/server/auth/http");
  const auth = createAuthService(db);
  return { db, auth, handlers: createAuthHandlers(auth, { appOrigin: "https://localhost" }) };
}
function request(path: string, data: unknown = {}, options: { method?: string; origin?: string | null; contentType?: string; cookie?: string } = {}) {
  const headers = new Headers({ "Content-Type": options.contentType ?? "application/json", "X-Taskboard-Client-IP": "127.0.0.1" });
  if (options.origin !== null) headers.set("Origin", options.origin ?? "https://localhost");
  if (options.cookie) headers.set("Cookie", options.cookie);
  return new Request(`https://localhost${path}`, { method: options.method ?? "POST", headers, ...(options.method === "GET" ? {} : { body: typeof data === "string" ? data : JSON.stringify(data) }) });
}
const registration = { email: "member@example.test", displayName: "Member", password: "correct-password-for-tests" };

test.each(["https://attacker.example", "null", null])("browser mutations reject origin %j without writing data", async (origin) => {
  const { db, handlers } = await fixture();
  const response = await handlers.register(request("/api/auth/register", registration, { origin }));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: { code: "FORBIDDEN" } });
  expect(await db.user.count()).toBe(0);
});

test("browser JSON endpoints reject wrong content type, malformed JSON, and oversized bodies", async () => {
  const { db, handlers } = await fixture();
  for (const invalid of [request("/api/auth/register", registration, { contentType: "text/plain" }), request("/api/auth/register", "{"), request("/api/auth/register", { ...registration, displayName: "x".repeat(17000) })]) {
    expect((await handlers.register(invalid)).status).toBe(400);
  }
  expect(await db.user.count()).toBe(0);
});

test("registration and login return safe account data with the raw session only in a secure cookie", async () => {
  const { handlers } = await fixture();
  expect((await handlers.register(request("/api/auth/register", registration))).status).toBe(201);
  const response = await handlers.login(request("/api/auth/login", { email: registration.email, password: registration.password }));
  expect(response.status).toBe(200);
  const cookie = response.headers.get("Set-Cookie")!;
  expect(cookie).toMatch(/^__Host-taskboard_session=[a-f0-9]{64};/);
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age=604800"]) expect(cookie).toContain(attribute);
  expect(cookie).not.toContain("Domain=");
  const text = await response.text();
  expect(JSON.parse(text)).toMatchObject({ data: { email: registration.email, role: "MEMBER" } });
  expect(text).not.toContain(registration.password);
  expect(text).not.toContain(cookie.split(";")[0].split("=")[1]);
  expect(text).not.toContain("passwordHash");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
});

test("account reads require a valid session and logout expires the cookie and revokes it", async () => {
  const { db, handlers } = await fixture();
  const user = await seedUser(db);
  const login = await handlers.login(request("/api/auth/login", { email: user.email, password: user.password }));
  const cookie = login.headers.get("Set-Cookie")!.split(";")[0];
  expect((await handlers.account(request("/api/account", {}, { method: "GET" }))).status).toBe(401);
  const account = await handlers.account(request("/api/account", {}, { method: "GET", cookie }));
  expect(account.status).toBe(200);
  expect(await account.json()).toMatchObject({ data: { id: user.actor.id, email: user.email } });
  const logout = await handlers.logout(request("/api/auth/logout", {}, { cookie }));
  expect(logout.status).toBe(204);
  expect(logout.headers.get("Set-Cookie")).toContain("Max-Age=0");
  expect((await handlers.account(request("/api/account", {}, { method: "GET", cookie }))).status).toBe(401);
});

test("password-change HTTP response clears the cookie and invalidates old account access", async () => {
  const { db, handlers } = await fixture();
  const user = await seedUser(db);
  const login = await handlers.login(request("/api/auth/login", { email: user.email, password: user.password }));
  const cookie = login.headers.get("Set-Cookie")!.split(";")[0];
  const changed = await handlers.changePassword(request("/api/account/password", { currentPassword: user.password, newPassword: "new-correct-password-42" }, { method: "PUT", cookie }));
  expect(changed.status).toBe(204);
  expect(changed.headers.get("Set-Cookie")).toContain("Max-Age=0");
  expect((await handlers.account(request("/api/account", {}, { method: "GET", cookie }))).status).toBe(401);
});

test("throttled login returns a Retry-After response rather than revealing credentials", async () => {
  const { handlers } = await fixture();
  for (let i = 0; i < 5; i++) expect((await handlers.login(request("/api/auth/login", { email: "missing@example.test", password: "wrong-password-42" }))).status).toBe(401);
  const limited = await handlers.login(request("/api/auth/login", { email: "missing@example.test", password: "wrong-password-42" }));
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(await limited.json()).toEqual({ error: { code: "RATE_LIMITED" } });
});

test("account PATCH requires authentication and cannot assign a role", async () => {
  const { db, handlers } = await fixture();
  const user = await seedUser(db);
  expect((await handlers.updateAccount(request("/api/account", { displayName: "Changed" }, { method: "PATCH" }))).status).toBe(401);
  const login = await handlers.login(request("/api/auth/login", { email: user.email, password: user.password }));
  const cookie = login.headers.get("Set-Cookie")!.split(";")[0];
  const changed = await handlers.updateAccount(request("/api/account", { displayName: "Changed" }, { method: "PATCH", cookie }));
  expect(changed.status).toBe(200);
  expect(await changed.json()).toMatchObject({ data: { id: user.actor.id, displayName: "Changed" } });
  expect((await handlers.updateAccount(request("/api/account", { role: "ADMIN" }, { method: "PATCH", cookie }))).status).toBe(400);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.actor.id } })).role).toBe("MEMBER");
});
