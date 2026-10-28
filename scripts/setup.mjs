import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const windowsPermissionScript = [
  '$ErrorActionPreference = "Stop"',
  "$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User",
  "$acl = New-Object System.Security.AccessControl.FileSecurity",
  "$acl.SetOwner($sid)",
  "$acl.SetAccessRuleProtection($true, $false)",
  '$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, "FullControl", "Allow")',
  "$acl.AddAccessRule($rule)",
  "[System.IO.File]::SetAccessControl($env:TICTACTOE_PRIVATE_FILE, $acl)",
].join("; ");

async function writePrivateEnvironment(target, contents) {
  // Restrict the newly created empty file before writing any credentials.
  // POSIX mode bits do not protect a Windows file: its DACL must be explicit.
  const file = await open(target, "wx", 0o600);
  let complete = false;
  try {
    if (process.platform === "win32") {
      const powershell = join(
        process.env.SystemRoot ?? "C:\\Windows",
        "System32/WindowsPowerShell/v1.0/powershell.exe",
      );
      const protection = spawnSync(
        powershell,
        ["-NoProfile", "-NonInteractive", "-Command", windowsPermissionScript],
        {
          encoding: "utf8",
          env: { ...process.env, TICTACTOE_PRIVATE_FILE: target },
          windowsHide: true,
        },
      );
      if (protection.status !== 0)
        throw new Error(
          "Unable to restrict Windows environment-file permissions; credentials were not written.",
        );
    }
    await file.writeFile(contents);
    complete = true;
  } finally {
    await file.close();
    if (!complete) await unlink(target);
  }
}

try {
  const { values } = parseArgs({
    options: {
      "env-file": { type: "string", default: ".env" },
      port: { type: "string", default: "443" },
    },
    strict: true,
  });
  if (!/^[0-9]+$/.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535)
    throw new Error("Port must be 1-65535");
  const port = Number(values.port);
  const origin = `https://localhost${port === 443 ? "" : `:${port}`}`;
  const contents =
    [
      "DATABASE_URL=file:./data/tictactoe.db",
      `APP_ORIGIN=${origin}`,
      `HTTPS_PORT=${port}`,
      "ADMIN_EMAIL=admin@tictactoe.local",
      `ADMIN_PASSWORD=${randomBytes(24).toString("hex")}`,
    ].join("\n") + "\n";
  const target = resolve(values["env-file"]);
  await writePrivateEnvironment(target, contents);
  console.log(`Created ${target}. Keep this file private; credentials are not printed.`);
} catch (error) {
  console.error(
    error?.code === "EEXIST"
      ? "Refusing to overwrite an existing environment file."
      : error.message,
  );
  process.exitCode = 1;
}
