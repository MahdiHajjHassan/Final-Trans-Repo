import "dotenv/config";
import assert from "node:assert/strict";
import { request } from "node:https";
import { readFile } from "node:fs/promises";

const origin = process.env.APP_ORIGIN ?? "https://localhost";
if (new URL(origin).protocol !== "https:") throw new Error("Auth smoke requires HTTPS");
const ca = await readFile(process.env.TASKBOARD_CA_FILE ?? "local-certs/root.crt");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error("Local admin credentials are missing");
function call(path, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, origin), { method: options.method ?? "GET", ca, rejectUnauthorized: true, timeout: 10000, headers: {
      Origin: options.origin ?? origin,
      ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = data && res.headers["content-type"]?.includes("application/json") ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch { reject(new Error("Invalid JSON response; body intentionally omitted")); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("Auth smoke timed out")));
    req.on("error", reject);
    req.end(body);
  });
}
const credentials = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
assert.equal((await call("/api/auth/login", { method: "POST", body: credentials, origin: "https://attacker.example" })).status, 403);
assert.equal((await call("/api/account")).status, 401);
const login = await call("/api/auth/login", { method: "POST", body: credentials });
assert.equal(login.status, 200);
const header = login.headers["set-cookie"]?.[0] ?? "";
if (!/^__Host-taskboard_session=[a-f0-9]{64};/.test(header) || !header.includes("HttpOnly") || !header.includes("Secure") || !header.includes("SameSite=Lax")) throw new Error("Secure session cookie missing or invalid");
const cookie = header.split(";")[0];
const account = await call("/api/account", { cookie });
assert.equal(account.status, 200);
if (account.body?.data?.id !== login.body?.data?.id || "passwordHash" in (account.body?.data ?? {})) throw new Error("Unsafe or mismatched account response");
const logout = await call("/api/auth/logout", { method: "POST", body: {}, cookie });
assert.equal(logout.status, 204);
assert.equal((await call("/api/account", { cookie })).status, 401);
console.log("Verified HTTPS auth: origin rejection, anonymous rejection, secure cookie, account read, and logout revocation. Credentials/tokens not printed.");
