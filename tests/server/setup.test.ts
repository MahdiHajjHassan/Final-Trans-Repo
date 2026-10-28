import { afterEach, expect, test } from "vitest";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
async function envPath() { const dir = await mkdtemp(join(tmpdir(), "tictactoe-setup-test-")); dirs.push(dir); return join(dir, ".env"); }
function setup(path: string, port = "443") { return spawnSync(process.execPath, ["--", resolve("scripts/setup.mjs"), "--env-file", path, "--port", port], { encoding: "utf8" }); }

test("bootstrap generates private credentials without printing them", async () => {
  const path = await envPath();
  const result = setup(path, "8443");
  expect(result.status, result.stderr).toBe(0);
  const contents = await readFile(path, "utf8");
  const entries = Object.fromEntries(contents.trim().split("\n").map((line) => line.split("=")));
  expect(entries.APP_ORIGIN).toBe("https://localhost:8443");
  expect(entries.HTTPS_PORT).toBe("8443");
  expect(entries.ADMIN_PASSWORD).toMatch(/^[a-f0-9]{48}$/);
  expect(entries.DATABASE_URL).toBe("file:./data/tictactoe.db");
  expect(entries.ADMIN_EMAIL).toBe("admin@tictactoe.local");
  expect(result.stdout).not.toContain(entries.ADMIN_PASSWORD);
  if (process.platform === "win32") {
    const inspection = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", '$ErrorActionPreference = "Stop"; $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $acl = [System.IO.File]::GetAccessControl($env:TICTACTOE_PRIVATE_FILE); $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { @{ sid = $_.IdentityReference.Value; inherited = $_.IsInherited; type = $_.AccessControlType.ToString(); rights = $_.FileSystemRights.ToString() } }); @{ sid = $sid; protected = $acl.AreAccessRulesProtected; rules = $rules } | ConvertTo-Json -Compress -Depth 4'], { encoding: "utf8", env: { ...process.env, TICTACTOE_PRIVATE_FILE: path } });
    expect(inspection.status, inspection.stderr).toBe(0);
    const permissions = JSON.parse(inspection.stdout);
    expect(permissions.protected).toBe(true);
    expect(permissions.rules).toEqual([{ sid: permissions.sid, inherited: false, type: "Allow", rights: "FullControl" }]);
  } else {
    expect((await stat(path)).mode & 0o077).toBe(0);
  }
});

test("bootstrap refuses to overwrite existing credentials", async () => {
  const path = await envPath();
  await writeFile(path, "existing-private-content\n");
  const result = setup(path);
  expect(result.status).not.toBe(0);
  expect(await readFile(path, "utf8")).toBe("existing-private-content\n");
  expect(result.stdout + result.stderr).not.toContain("existing-private-content");
});

test.each(["0", "65536", "443\nADMIN_PASSWORD=injected", "not-a-port"])("bootstrap rejects invalid port %j without creating an env file", async (port) => {
  const path = await envPath();
  expect(setup(path, port).status).not.toBe(0);
  await expect(readFile(path)).rejects.toThrow();
});
