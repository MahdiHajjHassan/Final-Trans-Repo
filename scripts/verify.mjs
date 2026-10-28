import { spawnSync } from "node:child_process";
const commands = [
  ["run", "typecheck"],
  ["run", "lint"],
  ["test"],
  ["run", "build"],
  ["run", "audit:source"],
  ["run", "test:e2e"],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  "Verification passed: types, lint, real-database tests, build, artifact audit, independently CA-verified HTTPS, and actual-browser suites.",
);
