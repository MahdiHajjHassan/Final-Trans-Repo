import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { rehearsalEnvironment } from "./lib/rehearsal-env.mjs";
import { copyWorkingSource } from "./lib/source.mjs";
const checkout = await mkdtemp(join(tmpdir(), "tictactoe-rehearsal-"));
const manifest = await copyWorkingSource(process.cwd(), checkout);
const env = rehearsalEnvironment(process.env, checkout);
const logDir = resolve(".logs");
await mkdir(logDir, { recursive: true });
let log = `Uncommitted working source: ${manifest.files.length} files\nFresh copy: ${checkout}\n`;
async function run(command, args, runEnv = env) {
  const actual = command === "npm" ? process.execPath : command;
  const actualArgs = command === "npm" ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(actual, actualArgs, {
    cwd: checkout,
    env: runEnv,
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
  });
  log += `\n${command} ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`;
  await writeFile(join(logDir, "rehearsal.log"), log, { mode: 0o600 });
  if (result.status !== 0)
    throw new Error(`Rehearsal failed at ${command}; see ignored rehearsal.log`);
}
await run("npm", ["ci"]);
await run("node", ["scripts/setup.mjs", "--port", "9443"]);
for (const args of [
  ["run", "db:migrate"],
  ["run", "db:seed"],
  ["test"],
  ["run", "typecheck"],
  ["run", "lint"],
  ["run", "build"],
  ["run", "audit:source"],
])
  await run("npm", args);
await run("npm", ["exec", "--", "playwright", "test", "--project=chrome"], {
  ...env,
  TICTACTOE_E2E_IMAGE: "",
  TICTACTOE_E2E_PROJECT: "tictactoe-e2e-rehearsal",
  TICTACTOE_E2E_PORT: "9443",
  TICTACTOE_E2E_ENV_FILE: join(checkout, ".env.e2e"),
  TICTACTOE_E2E_CA_VOLUME: "tictactoe-e2e-mahdi_caddy-data",
});
await writeFile(
  join(logDir, "rehearsal-result.json"),
  JSON.stringify(
    {
      kind: manifest.kind,
      files: manifest.files.length,
      checkout,
      project: "tictactoe-e2e-rehearsal",
      port: 9443,
      status: "passed",
      checks:
        "fresh private source copy, npm ci, own setup, migrations, seed, server tests, types, lint, build, audit, separate Compose build, trusted HTTPS Chrome flows; only public test CA volume reused",
    },
    null,
    2,
  ),
);
console.log(
  "Fresh working-source rehearsal passed. Private copy and isolated test project retained for inspection; no commit made.",
);
