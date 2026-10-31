import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { lstat, open, readFile, rename, unlink } from "node:fs/promises";
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

async function updateEnvironmentPort(target, port, origin) {
  // Replace only the public connection settings, never regenerate credentials.
  if (!(await lstat(target)).isFile())
    throw new Error("Port update requires a regular environment file.");
  const original = await readFile(target, "utf8");
  const replacements = new Map([
    ["HTTPS_PORT", String(port)],
    ["APP_ORIGIN", origin],
  ]);
  // Consume complete quoted values so assignment-like text inside secrets is untouched.
  const assignment =
    /^([ \t\uFEFF]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*)(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|[^\r\n]*)/gm;
  const matches = [...original.matchAll(assignment)];
  for (const key of replacements.keys()) {
    if (matches.filter((match) => match[2] === key).length !== 1)
      throw new Error(`Port update requires exactly one ${key} assignment.`);
  }
  const contents = original.replace(assignment, (line, prefix, key) => {
    if (!replacements.has(key)) return line;
    const comment = line.match(/[ \t]+#.*$/)?.[0] ?? "";
    return `${prefix}${replacements.get(key)}${comment}`;
  });
  if (contents === original) return;

  // Write privately beside the original, then replace it atomically.
  const temporary = `${target}.${randomBytes(12).toString("hex")}.tmp`;
  try {
    await writePrivateEnvironment(temporary, contents);
    if ((await readFile(target, "utf8")) !== original)
      throw new Error("Environment file changed during port update; retry the command.");
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

try {
  const { values } = parseArgs({
    options: {
      "env-file": { type: "string", default: ".env" },
      port: { type: "string", default: "8443" },
      "update-port": { type: "boolean", default: false },
    },
    strict: true,
  });
  if (!/^[0-9]+$/.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535)
    throw new Error("Port must be 1-65535");
  const port = Number(values.port);
  const origin = `https://localhost${port === 443 ? "" : `:${port}`}`;
  const target = resolve(values["env-file"]);
  if (values["update-port"]) {
    await updateEnvironmentPort(target, port, origin);
    console.log(`Updated HTTPS port and origin in ${target}. Credentials were preserved.`);
  } else {
    const contents =
      [
        "DATABASE_URL=file:./data/tictactoe.db",
        `APP_ORIGIN=${origin}`,
        `HTTPS_PORT=${port}`,
        "ADMIN_EMAIL=admin@tictactoe.local",
        `ADMIN_PASSWORD=${randomBytes(24).toString("hex")}`,
      ].join("\n") + "\n";
    await writePrivateEnvironment(target, contents);
    console.log(`Created ${target}. Keep this file private; credentials are not printed.`);
  }
} catch (error) {
  console.error(
    error?.code === "EEXIST"
      ? "Refusing to overwrite an existing environment file."
      : error.message,
  );
  process.exitCode = 1;
}
