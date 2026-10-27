import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

try {
  const { values } = parseArgs({ options: { "env-file": { type: "string", default: ".env" }, port: { type: "string", default: "443" } }, strict: true });
  if (!/^[0-9]+$/.test(values.port) || Number(values.port) < 1 || Number(values.port) > 65535) throw new Error("Port must be 1-65535");
  const port = Number(values.port);
  const origin = `https://localhost${port === 443 ? "" : `:${port}`}`;
  const contents = [
    "DATABASE_URL=file:./data/tictactoe.db", `APP_ORIGIN=${origin}`, `HTTPS_PORT=${port}`,
    "ADMIN_EMAIL=admin@tictactoe.local", `ADMIN_PASSWORD=${randomBytes(24).toString("hex")}`,
  ].join("\n") + "\n";
  const target = resolve(values["env-file"]);
  await writeFile(target, contents, { mode: 0o600, flag: "wx" });
  console.log(`Created ${target}. Keep this file private; credentials are not printed.`);
} catch (error) {
  console.error(error?.code === "EEXIST" ? "Refusing to overwrite an existing environment file." : error.message);
  process.exitCode = 1;
}
