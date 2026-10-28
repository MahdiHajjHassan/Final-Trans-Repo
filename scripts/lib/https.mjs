import "dotenv/config";
import { get } from "node:https";
import { readFile } from "node:fs/promises";

export async function verifiedJson(path) {
  const origin = new URL(process.env.APP_ORIGIN ?? "https://localhost");
  if (origin.protocol !== "https:") throw new Error("Smoke checks require HTTPS");
  const ca = await readFile(process.env.TASKBOARD_CA_FILE ?? "local-certs/root.crt");
  return new Promise((resolve, reject) => {
    const request = get(
      new URL(path, origin),
      { ca, rejectUnauthorized: true, timeout: 10000 },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Invalid health response"));
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("HTTPS readiness timed out")));
    request.on("error", reject);
  });
}
