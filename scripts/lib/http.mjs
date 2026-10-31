import "dotenv/config";
import { request } from "node:https";
import { readFile } from "node:fs/promises";

export const origin = process.env.APP_ORIGIN ?? "https://localhost";

export function createClient({ origin, caFile }) {
  if (new URL(origin).protocol !== "https:") throw new Error("Smoke checks require HTTPS");
  async function call(path, { method = "GET", body, cookie, origin: headerOrigin = origin } = {}) {
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    const ca = await readFile(caFile);
    return new Promise((resolve, reject) => {
      const req = request(
        new URL(path, origin),
        {
          method,
          ca,
          rejectUnauthorized: true,
          timeout: 10000,
          headers: {
            Origin: headerOrigin,
            ...(encoded !== undefined
              ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(encoded) }
              : {}),
            ...(cookie ? { Cookie: cookie } : {}),
          },
        },
        (res) => {
          let text = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("error", reject);
          res.on("end", () => {
            try {
              const body =
                text && res.headers["content-type"]?.includes("application/json")
                  ? JSON.parse(text)
                  : null;
              resolve({ status: res.statusCode, headers: res.headers, body, data: body?.data });
            } catch {
              reject(new Error("Invalid JSON response; body intentionally omitted"));
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => req.destroy(new Error("Verified HTTPS request timed out")));
      req.end(encoded);
    });
  }
  async function verifiedJson(path) {
    const result = await call(path);
    if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
    if (result.body === null) throw new Error("Invalid health response; body omitted");
    return result.body;
  }
  return { call, verifiedJson };
}

function defaultClient(preferred, fallback) {
  return createClient({
    origin,
    caFile: process.env[preferred] ?? process.env[fallback] ?? "local-certs/root.crt",
  });
}
export function call(path, options) {
  return defaultClient("TICTACTOE_CA_FILE", "TASKBOARD_CA_FILE").call(path, options);
}
export function verifiedJson(path) {
  return defaultClient("TASKBOARD_CA_FILE", "TICTACTOE_CA_FILE").verifiedJson(path);
}
export function authCall(path, options) {
  return defaultClient("TASKBOARD_CA_FILE", "TICTACTOE_CA_FILE").call(path, options);
}

export async function login(credentials) {
  const result = await call("/api/auth/login", { method: "POST", body: credentials });
  if (result.status === 202)
    throw new Error("Verify this account's email in the browser before running smoke checks");
  if (result.status !== 200) throw new Error("Smoke sign-in failed; credentials omitted");
  const cookie = result.headers["set-cookie"]?.[0]?.split(";")[0];
  if (!cookie) throw new Error("Session cookie missing");
  return { cookie, account: result.data };
}
