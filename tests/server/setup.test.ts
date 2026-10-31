import { afterEach, expect, test } from "vitest";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function envPath() {
  const dir = await mkdtemp(join(tmpdir(), "tictactoe-setup-test-"));
  dirs.push(dir);
  return join(dir, ".env");
}
function setup(path: string, port?: string, args: string[] = []) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/setup.mjs"),
      "--env-file",
      path,
      ...(port ? ["--port", port] : []),
      ...args,
    ],
    { encoding: "utf8" },
  );
}

test("bootstrap defaults to unprivileged HTTPS with private credentials", async () => {
  const path = await envPath();
  const result = setup(path);
  expect(result.status, result.stderr).toBe(0);
  const contents = await readFile(path, "utf8");
  const entries = Object.fromEntries(
    contents
      .trim()
      .split("\n")
      .map((line) => line.split("=")),
  );
  expect(entries.APP_ORIGIN).toBe("https://localhost:8443");
  expect(entries.HTTPS_PORT).toBe("8443");
  expect(entries.ADMIN_PASSWORD).toMatch(/^[a-f0-9]{48}$/);
  expect(entries.DATABASE_URL).toBe("file:./data/tictactoe.db");
  expect(entries.ADMIN_EMAIL).toBe("admin@tictactoe.local");
  expect(result.stdout).not.toContain(entries.ADMIN_PASSWORD);
  if (process.platform === "win32") {
    const inspection = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        '$ErrorActionPreference = "Stop"; $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $acl = [System.IO.File]::GetAccessControl($env:TICTACTOE_PRIVATE_FILE); $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { @{ sid = $_.IdentityReference.Value; inherited = $_.IsInherited; type = $_.AccessControlType.ToString(); rights = $_.FileSystemRights.ToString() } }); @{ sid = $sid; protected = $acl.AreAccessRulesProtected; rules = $rules } | ConvertTo-Json -Compress -Depth 4',
      ],
      { encoding: "utf8", env: { ...process.env, TICTACTOE_PRIVATE_FILE: path } },
    );
    expect(inspection.status, inspection.stderr).toBe(0);
    const permissions = JSON.parse(inspection.stdout);
    expect(permissions.protected).toBe(true);
    expect(permissions.rules).toEqual([
      { sid: permissions.sid, inherited: false, type: "Allow", rights: "FullControl" },
    ]);
  } else {
    expect((await stat(path)).mode & 0o077).toBe(0);
  }
});

test.each([
  ["443", "https://localhost"],
  ["9443", "https://localhost:9443"],
])("bootstrap preserves explicit HTTPS port %s", async (port, origin) => {
  const path = await envPath();
  const result = setup(path, port);
  expect(result.status, result.stderr).toBe(0);
  const contents = await readFile(path, "utf8");
  expect(contents).toContain(`HTTPS_PORT=${port}\n`);
  expect(contents).toContain(`APP_ORIGIN=${origin}\n`);
});

test("bootstrap refuses to overwrite existing credentials", async () => {
  const path = await envPath();
  await writeFile(path, "existing-private-content\n");
  const result = setup(path);
  expect(result.status).not.toBe(0);
  expect(await readFile(path, "utf8")).toBe("existing-private-content\n");
  expect(result.stdout + result.stderr).not.toContain("existing-private-content");
});

test.each(["0", "65536", "443\nADMIN_PASSWORD=injected", "not-a-port"])(
  "bootstrap rejects invalid port %j without creating an env file",
  async (port) => {
    const path = await envPath();
    expect(setup(path, port).status).not.toBe(0);
    await expect(readFile(path)).rejects.toThrow();
  },
);

test.each([
  ["8443", "https://localhost:8443"],
  ["9443", "https://localhost:9443"],
])(
  "port update migrates an old bootstrap to %s without replacing private settings",
  async (port, origin) => {
    const path = await envPath();
    const initial = setup(path, "443");
    expect(initial.status, initial.stderr).toBe(0);
    const generated = await readFile(path, "utf8");
    const password = generated.match(/^ADMIN_PASSWORD=(.+)$/m)![1];
    const additions =
      "# Preserve this operator comment\n" +
      "SMTP_HOST=smtp.example.test\n" +
      'SMTP_PASSWORD="fixture-private-smtp=value"\n';
    const original =
      generated.replace(
        "DATABASE_URL=file:./data/tictactoe.db\n",
        "DATABASE_URL=file:./data/existing-game.db\n",
      ) + additions;
    await writeFile(path, original);

    const unchanged = setup(path);
    expect(unchanged.status).not.toBe(0);
    expect(await readFile(path, "utf8")).toBe(original);

    const result = setup(path, port, ["--update-port"]);
    expect(result.status, result.stderr).toBe(0);
    const expected = original
      .replace("HTTPS_PORT=443\n", `HTTPS_PORT=${port}\n`)
      .replace("APP_ORIGIN=https://localhost\n", `APP_ORIGIN=${origin}\n`);
    expect(await readFile(path, "utf8")).toBe(expected);
    expect(result.stdout + result.stderr).not.toContain(password);
    expect(result.stdout + result.stderr).not.toContain("fixture-private-smtp=value");
    if (process.platform !== "win32") expect((await stat(path)).mode & 0o077).toBe(0);

    const repeated = setup(path, port, ["--update-port"]);
    expect(repeated.status, repeated.stderr).toBe(0);
    expect(await readFile(path, "utf8")).toBe(expected);
  },
);

test.each([true, false])(
  "port update preserves CRLF and trailing-newline presence %s",
  async (trailing) => {
    const path = await envPath();
    const original =
      [
        "# Keep this comment",
        'ADMIN_PASSWORD="fixture-private-admin=value"',
        "HTTPS_PORT=443",
        "APP_ORIGIN=https://localhost",
        "SMTP_PASSWORD=fixture-private-smtp",
      ].join("\r\n") + (trailing ? "\r\n" : "");
    const expected =
      [
        "# Keep this comment",
        'ADMIN_PASSWORD="fixture-private-admin=value"',
        "HTTPS_PORT=8443",
        "APP_ORIGIN=https://localhost:8443",
        "SMTP_PASSWORD=fixture-private-smtp",
      ].join("\r\n") + (trailing ? "\r\n" : "");
    await writeFile(path, original, { mode: 0o600 });
    const result = setup(path, "8443", ["--update-port"]);
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(path, "utf8")).toBe(expected);
    expect(result.stdout + result.stderr).not.toContain("fixture-private-admin=value");
    expect(result.stdout + result.stderr).not.toContain("fixture-private-smtp");
  },
);

test.each(["0", "65536", "443\nADMIN_PASSWORD=injected", "not-a-port"])(
  "port update rejects invalid port %j without changing the private file",
  async (port) => {
    const path = await envPath();
    const original =
      "HTTPS_PORT=443\nAPP_ORIGIN=https://localhost\nADMIN_PASSWORD=fixture-private-admin\n";
    await writeFile(path, original, { mode: 0o600 });
    const result = setup(path, port, ["--update-port"]);
    expect(result.status).not.toBe(0);
    expect(await readFile(path, "utf8")).toBe(original);
    expect(result.stdout + result.stderr).not.toContain("fixture-private-admin");
  },
);

test("port update refuses a missing environment file without creating credentials", async () => {
  const path = await envPath();
  const result = setup(path, "8443", ["--update-port"]);
  expect(result.status).not.toBe(0);
  await expect(readFile(path)).rejects.toMatchObject({ code: "ENOENT" });
});

test.each([
  ["missing port", "APP_ORIGIN=https://localhost\n"],
  ["missing origin", "HTTPS_PORT=443\n"],
  ["duplicate port", "HTTPS_PORT=443\nHTTPS_PORT=9443\nAPP_ORIGIN=https://localhost\n"],
  [
    "duplicate origin",
    "HTTPS_PORT=443\nAPP_ORIGIN=https://localhost\nAPP_ORIGIN=https://localhost:9443\n",
  ],
])("port update refuses %s without changing private configuration", async (_name, values) => {
  const path = await envPath();
  const original = values + "ADMIN_PASSWORD=fixture-private-admin\n";
  await writeFile(path, original, { mode: 0o600 });
  const result = setup(path, "8443", ["--update-port"]);
  expect(result.status).not.toBe(0);
  expect(await readFile(path, "utf8")).toBe(original);
  expect(result.stdout + result.stderr).not.toContain("fixture-private-admin");
});

test("port update replaces a complete multiline quoted origin without leaving its closing quote", async () => {
  const path = await envPath();
  const original =
    "HTTPS_PORT=443\nAPP_ORIGIN='https://localhost\n'\nADMIN_PASSWORD=fixture-private-admin\n";
  const expected =
    "HTTPS_PORT=8443\nAPP_ORIGIN=https://localhost:8443\nADMIN_PASSWORD=fixture-private-admin\n";
  await writeFile(path, original, { mode: 0o600 });
  const result = setup(path, "8443", ["--update-port"]);
  expect(result.status, result.stderr).toBe(0);
  expect(await readFile(path, "utf8")).toBe(expected);
  expect(result.stdout + result.stderr).not.toContain("fixture-private-admin");
});

test("port update preserves assignment-like lines inside a multiline SMTP password", async () => {
  const path = await envPath();
  const privateSettings =
    'SMTP_PASSWORD="fixture-private-smtp\n' +
    "HTTPS_PORT=4999\n" +
    "APP_ORIGIN=https://password.example.test\n" +
    'fixture-private-end"\n';
  const original = privateSettings + "HTTPS_PORT=443\nAPP_ORIGIN=https://localhost\n";
  const expected = privateSettings + "HTTPS_PORT=8443\nAPP_ORIGIN=https://localhost:8443\n";
  await writeFile(path, original, { mode: 0o600 });
  const result = setup(path, "8443", ["--update-port"]);
  expect(result.status, result.stderr).toBe(0);
  expect(await readFile(path, "utf8")).toBe(expected);
  expect(result.stdout + result.stderr).not.toContain("fixture-private-smtp");
  expect(result.stdout + result.stderr).not.toContain("password.example.test");
});

test("port update accepts and preserves a BOM before the first target assignment", async () => {
  const path = await envPath();
  const original =
    "\uFEFFHTTPS_PORT=443\nAPP_ORIGIN=https://localhost\nADMIN_PASSWORD=fixture-private-admin\n";
  const expected =
    "\uFEFFHTTPS_PORT=8443\nAPP_ORIGIN=https://localhost:8443\nADMIN_PASSWORD=fixture-private-admin\n";
  await writeFile(path, original, { mode: 0o600 });
  const result = setup(path, "8443", ["--update-port"]);
  expect(result.status, result.stderr).toBe(0);
  expect(await readFile(path, "utf8")).toBe(expected);
  expect(result.stdout + result.stderr).not.toContain("fixture-private-admin");
});
