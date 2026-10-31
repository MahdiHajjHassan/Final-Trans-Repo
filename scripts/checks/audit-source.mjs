import "dotenv/config";
import { readdir, readFile, lstat } from "node:fs/promises";
import { sourceFiles } from "../lib/source.mjs";
import { join } from "node:path";
for (const path of await sourceFiles()) {
  if (
    (/(^|\/)\.env(?:\.|$)/.test(path) && path !== ".env.example") ||
    /\.(?:db|sqlite)(?:-|$)|(?:^|\/)(?:test-results|playwright-report|local-certs)\/|\.(?:pem|key)$/.test(
      path,
    )
  )
    throw new Error(`Private/generated artifact in source: ${path}`);
}
const secrets = ["ADMIN_PASSWORD", "PUBLIC_API_KEY", "SMTP_PASSWORD"]
  .map((name) => [name, process.env[name]])
  .filter(([, value]) => value);
async function inspect(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isSymbolicLink()) throw new Error("Public build refuses symlinks");
    if (file.isDirectory()) await inspect(path);
    else if (/\.(?:js|json|html|map)$/.test(path)) {
      const text = await readFile(path, "utf8");
      for (const [name, value] of secrets)
        if (text.includes(value))
          throw new Error(`Configured ${name} found in public build artifact (value omitted)`);
    }
  }
}
let buildPresent = false;
try {
  const stat = await lstat(".next/static");
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Public build must be a real directory");
  buildPresent = true;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (buildPresent) {
  await inspect(".next/static");
  console.log(
    "Exported source excludes private/generated artifacts; configured credentials absent from public build output.",
  );
} else {
  console.log(
    "Exported source excludes private/generated artifacts; no public build output to inspect (run npm run build first).",
  );
}
