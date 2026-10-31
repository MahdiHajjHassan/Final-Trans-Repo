import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:https";
import {
  smokeCaCertificate,
  smokeOtherCaCertificate,
  smokeServerCertificate,
  smokeServerPrivateKey,
} from "../helpers/smoke-tls-fixtures";
// @ts-expect-error JavaScript smoke helper has no declaration file.
import * as transport from "../../scripts/lib/http.mjs";

const directory = mkdtempSync(join(tmpdir(), "smoke-tls-"));
let server: Server;
let origin: string;
const caFile = join(directory, "ca.crt");
beforeAll(async () => {
  writeFileSync(caFile, smokeCaCertificate);
  writeFileSync(join(directory, "other.crt"), smokeOtherCaCertificate);
  server = createServer(
    {
      key: smokeServerPrivateKey,
      cert: smokeServerCertificate,
    },
    (req, res) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        if (req.url === "/empty") {
          res.writeHead(204).end();
          return;
        }
        if (req.url === "/text") {
          res.end("plain text");
          return;
        }
        res.setHeader("content-type", "application/json");
        if (req.url === "/api/auth/login" && raw.includes('"mode":"unverified"')) {
          res.writeHead(202).end("{}");
          return;
        }
        if (req.url === "/api/auth/login" && raw.includes('"mode":"invalid"')) {
          res.writeHead(401).end("{}");
          return;
        }
        if (req.url === "/api/auth/login" && raw.includes('"mode":"no-cookie"')) {
          res.end("{}");
          return;
        }
        if (req.url === "/malformed") {
          res.end('{"password":"secret-password",BROKEN');
          return;
        }
        if (req.url === "/missing") {
          res.writeHead(503).end('{"error":"unavailable"}');
          return;
        }
        res.setHeader("set-cookie", "session=test; Secure; HttpOnly");
        res.end(
          JSON.stringify(
            req.url === "/health"
              ? { status: "ok", database: "ok" }
              : {
                  data: {
                    raw,
                    cookie: req.headers.cookie,
                    origin: req.headers.origin,
                    contentType: req.headers["content-type"],
                    length: req.headers["content-length"],
                  },
                },
          ),
        );
      });
    },
  );
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server port");
  origin = `https://localhost:${address.port}`;
});
afterAll(async () => {
  if (server?.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(directory, { recursive: true, force: true });
});

describe("verified smoke HTTPS client", () => {
  it("imports without reading missing production CA files", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ["--input-type=module", "-e", 'await import("./scripts/lib/http.mjs")'],
        {
          env: {
            ...process.env,
            TASKBOARD_CA_FILE: join(directory, "absent"),
            TICTACTOE_CA_FILE: join(directory, "absent"),
          },
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });
  it("preserves legacy CA preferences, fallbacks, and login behavior", async () => {
    const saved = {
      APP_ORIGIN: process.env.APP_ORIGIN,
      TASKBOARD_CA_FILE: process.env.TASKBOARD_CA_FILE,
      TICTACTOE_CA_FILE: process.env.TICTACTOE_CA_FILE,
    };
    // Defaults capture APP_ORIGIN on import, so use a fresh module in a child process.
    const script = `
      import assert from "node:assert/strict";
      const h = await import("./scripts/lib/http.mjs");
      const trusted = process.env.TICTACTOE_CA_FILE;
      const other = process.env.TASKBOARD_CA_FILE;
      await h.call("/health");
      await assert.rejects(h.authCall("/health"));
      await assert.rejects(h.verifiedJson("/health"));
      process.env.TASKBOARD_CA_FILE = trusted;
      process.env.TICTACTOE_CA_FILE = other;
      await h.authCall("/health"); await h.verifiedJson("/health");
      await assert.rejects(h.call("/health"));
      delete process.env.TICTACTOE_CA_FILE;
      await h.call("/health");
      delete process.env.TASKBOARD_CA_FILE;
      process.env.TICTACTOE_CA_FILE = trusted;
      await h.authCall("/health"); await h.verifiedJson("/health");
      assert.equal((await h.login({ mode: "ok" })).cookie, "session=test");
      await assert.rejects(h.login({ mode: "unverified" }), /Verify this account/);
      await assert.rejects(h.login({ mode: "invalid" }), /credentials omitted/);
      await assert.rejects(h.login({ mode: "no-cookie" }), /Session cookie missing/);
    `;
    const { execFile } = await import("node:child_process");
    await new Promise<void>((resolve, reject) =>
      execFile(
        process.execPath,
        ["--input-type=module", "-e", script],
        {
          env: {
            ...process.env,
            ...saved,
            APP_ORIGIN: origin,
            TICTACTOE_CA_FILE: caFile,
            TASKBOARD_CA_FILE: join(directory, "other.crt"),
          },
        },
        (error) => (error ? reject(error) : resolve()),
      ),
    );
  });

  it("exports a factory without loading the production CA", () => {
    expect(transport.createClient).toBeTypeOf("function");
  });
  it("gets trusted health JSON and complete response metadata", async () => {
    const client = transport.createClient({ origin, caFile });
    expect(await client.verifiedJson("/health")).toEqual({ status: "ok", database: "ok" });
    const result = await client.call("/health");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: "ok", database: "ok" });
    expect(result.headers["set-cookie"]).toEqual(["session=test; Secure; HttpOnly"]);
  });
  it("encodes JSON, preserves cookies and defaults or overrides only the Origin header", async () => {
    const client = transport.createClient({ origin, caFile });
    const body = { message: "héllo", password: "secret-password" };
    for (const headerOrigin of [origin, "https://attacker.example"]) {
      const result = await client.call("/echo", {
        method: "POST",
        body,
        cookie: "session=private",
        origin: headerOrigin,
      });
      expect(result.data).toEqual({
        raw: JSON.stringify(body),
        cookie: "session=private",
        origin: headerOrigin,
        contentType: "application/json",
        length: String(Buffer.byteLength(JSON.stringify(body))),
      });
      expect(result.body.data).toEqual(result.data);
    }
  });
  it("returns null for empty and non-JSON bodies", async () => {
    const client = transport.createClient({ origin, caFile });
    expect(await client.call("/empty")).toMatchObject({ status: 204, body: null, data: undefined });
    expect((await client.call("/text")).body).toBeNull();
  });
  it("rejects untrusted certificates", async () => {
    const client = transport.createClient({ origin, caFile: join(directory, "other.crt") });
    await expect(client.call("/health")).rejects.toThrow(/certificate|issuer/i);
  });
  it("rejects wrong hostnames even with the trusted CA", async () => {
    const client = transport.createClient({
      origin: origin.replace("localhost", "127.0.0.1"),
      caFile,
    });
    await expect(client.call("/health")).rejects.toThrow(/hostname|altnames/i);
  });
  it("omits response bodies and credentials from malformed JSON errors", async () => {
    const client = transport.createClient({ origin, caFile });
    const error = await client
      .call("/malformed", {
        method: "POST",
        body: { password: "secret-password" },
        cookie: "session=private",
      })
      .catch((error: Error) => error);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/Invalid.*response/);
    expect(String(error)).not.toMatch(/secret-password|session=private|BROKEN/);
  });
  it("rejects non-success health responses and non-HTTPS origins", async () => {
    const client = transport.createClient({ origin, caFile });
    await expect(client.verifiedJson("/missing")).rejects.toThrow("HTTP 503");
    expect(() => transport.createClient({ origin: "http://localhost", caFile })).toThrow(/HTTPS/);
  });
});
