import "dotenv/config";
import assert from "node:assert/strict";
import { authCall as call } from "../lib/http.mjs";

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error("Local admin credentials are missing");
const credentials = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
assert.equal(
  (
    await call("/api/auth/login", {
      method: "POST",
      body: credentials,
      origin: "https://attacker.example",
    })
  ).status,
  403,
);
assert.equal((await call("/api/account")).status, 401);
const login = await call("/api/auth/login", { method: "POST", body: credentials });
if (login.status === 202)
  throw new Error("Verify the administrator email in the browser before running auth smoke");
assert.equal(login.status, 200);
const header = login.headers["set-cookie"]?.[0] ?? "";
if (
  !/^__Host-taskboard_session=[a-f0-9]{64};/.test(header) ||
  !header.includes("HttpOnly") ||
  !header.includes("Secure") ||
  !header.includes("SameSite=Lax")
)
  throw new Error("Secure session cookie missing or invalid");
const cookie = header.split(";")[0];
const account = await call("/api/account", { cookie });
assert.equal(account.status, 200);
if (account.body?.data?.id !== login.body?.data?.id || "passwordHash" in (account.body?.data ?? {}))
  throw new Error("Unsafe or mismatched account response");
const logout = await call("/api/auth/logout", { method: "POST", body: {}, cookie });
assert.equal(logout.status, 204);
assert.equal((await call("/api/account", { cookie })).status, 401);
console.log(
  "Verified HTTPS auth: origin rejection, anonymous rejection, secure cookie, account read, and logout revocation. Credentials/tokens not printed.",
);
