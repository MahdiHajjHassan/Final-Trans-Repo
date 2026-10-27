import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { sourceFiles } from "./lib/source.mjs";
import { join } from "node:path";
for (const path of await sourceFiles()) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && path !== ".env.example" || /\.(?:db|sqlite)(?:-|$)|(?:^|\/)(?:test-results|playwright-report|local-certs)\/|\.(?:pem|key)$/.test(path)) throw new Error(`Private/generated artifact in source: ${path}`);
}
const secrets = ["ADMIN_PASSWORD", "PUBLIC_API_KEY"].map((name) => [name, process.env[name]]).filter(([, value]) => value);
async function inspect(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) await inspect(path);
    else if (/\.(?:js|json|html|map)$/.test(path)) {
      const text = await readFile(path, "utf8");
      for (const [name, value] of secrets) if (text.includes(value)) throw new Error(`Configured ${name} found in public build artifact (value omitted)`);
    }
  }
}
await inspect(".next/static");
console.log("No private source artifacts; configured credentials absent from public build output.");
