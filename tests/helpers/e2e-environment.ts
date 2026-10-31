import { existsSync, readFileSync, mkdirSync, appendFileSync, lstatSync } from "node:fs";
import { resolve, relative, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

export function testSettings() {
  const project = process.env.TICTACTOE_E2E_PROJECT ?? "tictactoe-e2e-mahdi";
  const port = Number(process.env.TICTACTOE_E2E_PORT ?? 8443);
  if (
    !/^tictactoe-e2e-[a-z0-9-]+$/.test(project) ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  )
    throw new Error("Refusing a non-isolated test project or port");
  const mailPort = Number(
    process.env.TICTACTOE_E2E_MAIL_PORT ?? (port === 65535 ? 65534 : port + 1),
  );
  if (!Number.isInteger(mailPort) || mailPort < 1024 || mailPort > 65535 || mailPort === port)
    throw new Error("Refusing an invalid or overlapping isolated mailbox port");
  const envFile = resolve(process.env.TICTACTOE_E2E_ENV_FILE ?? ".env.e2e");
  const envName = relative(process.cwd(), envFile);
  if (
    !/^\.env\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(envName) ||
    envName.toLowerCase() === ".env.example" ||
    (existsSync(envFile) && !lstatSync(envFile).isFile())
  )
    throw new Error("Test credentials must use a separate ignored .env.* file");
  const logDir = resolve(process.env.TICTACTOE_E2E_LOG_DIR ?? ".logs");
  mkdirSync(logDir, { recursive: true });
  const values = existsSync(envFile) ? parse(readFileSync(envFile)) : {};
  const files = [
    "compose.yaml",
    ...(process.env.CODEX_PROXY_CERT ? ["deploy/compose.cloud.yaml"] : []),
    "deploy/compose.e2e.yaml",
  ];
  return {
    project,
    port,
    mailPort,
    envFile,
    logDir,
    values,
    env: {
      ...process.env,
      ...values,
      TICTACTOE_E2E_PROJECT: project,
      TICTACTOE_E2E_MAIL_PORT: String(mailPort),
      TICTACTOE_E2E_CA_VOLUME: process.env.TICTACTOE_E2E_CA_VOLUME ?? `${project}_caddy-data`,
      COMPOSE_FILE: files.join(delimiter),
      COMPOSE_PATH_SEPARATOR: delimiter,
    },
  };
}
export function runTestCommand(command: string, args: string[]) {
  const settings = testSettings();
  const result = spawnSync(command, args, {
    env: settings.env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  let diagnostic = `${command} ${args.slice(0, 4).join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}\n`;
  for (const [name, value] of Object.entries(settings.env)) {
    if (value && /(?:PASSWORD|SECRET|TOKEN|(?:^|_)KEY)$/i.test(name))
      diagnostic = diagnostic.replaceAll(value, "[redacted]");
  }
  appendFileSync(resolve(settings.logDir, "e2e-commands.log"), diagnostic);
  if (result.status !== 0)
    throw new Error(`Test setup command failed (${command}); see ignored e2e-commands.log`);
  return result.stdout;
}
export function composeArgs(args: string[]) {
  const { project, envFile } = testSettings();
  return ["compose", "--project-name", project, "--env-file", envFile, ...args];
}
export async function resetTestDb() {
  const { project } = testSettings();
  const label = runTestCommand("docker", [
    "inspect",
    "--format",
    '{{index .Config.Labels "com.docker.compose.project"}}',
    `${project}-app-1`,
  ]).trim();
  if (label !== project)
    throw new Error("Refusing to reset a container outside the selected test project");
  runTestCommand(
    "docker",
    composeArgs([
      "exec",
      "-T",
      "app",
      "./node_modules/.bin/tsx",
      "scripts/db/test-db.ts",
      "--project",
      project,
    ]),
  );
  const response = await fetch(`http://127.0.0.1:${testSettings().mailPort}/api/v1/messages`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Cannot reset the isolated test mailbox");
}
