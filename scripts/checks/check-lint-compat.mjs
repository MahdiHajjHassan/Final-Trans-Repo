import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { ESLint } from "eslint";
import { fixupConfigRules } from "@eslint/compat";

const require = createRequire(import.meta.url);
const requireNext = createRequire(require.resolve("eslint-config-next"));
const minimatch = require("@tic-tac-toe/minimatch-compat");

// npm installs the vetted local tarball. Fail if readable sources drift from
// the exact payload checked by package-lock integrity during npm ci.
const archivePath = "tooling/tic-tac-toe-minimatch-compat-1.0.2.tgz";
const archive = readFileSync(new URL(`../../${archivePath}`, import.meta.url));
const integrity = `sha512-${createHash("sha512").update(archive).digest("base64")}`;
const lock = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8"));
const lockedAdapters = Object.entries(lock.packages).filter(
  ([, entry]) => entry.resolved === `file:${archivePath}`,
);
assert.deepEqual(lockedAdapters.map(([name]) => name).sort(), [
  "node_modules/@tic-tac-toe/minimatch-compat",
  "node_modules/minimatch",
]);
for (const [name, entry] of lockedAdapters) {
  assert.equal(entry.integrity, integrity, `Stale archive integrity in ${name}`);
  assert.equal(entry.version, "1.0.2");
}
const readableIndex = readFileSync(
  new URL("../../tooling/minimatch-compat/index.cjs", import.meta.url),
);
for (const alias of ["@tic-tac-toe/minimatch-compat", "minimatch"]) {
  assert.deepEqual(
    readFileSync(require.resolve(alias)),
    readableIndex,
    `Stale installed adapter: ${alias}`,
  );
}
const payload = gunzipSync(archive, { maxOutputLength: 1024 * 1024 });
const packed = new Map();
for (let offset = 0; offset + 512 <= payload.length;) {
  const header = payload.subarray(offset, offset + 512);
  if (header.every((byte) => byte === 0)) break;
  const name = header.toString("utf8", 0, 100).replace(/\0.*$/s, "");
  assert.equal(header.toString("utf8", 345, 500).replace(/\0.*$/s, ""), "");
  assert.ok([0, 48].includes(header[156]), "Only regular source files are allowed");
  const size = Number.parseInt(header.toString("utf8", 124, 136), 8);
  assert.ok(Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= payload.length);
  assert.ok(!packed.has(name), "Duplicate tar entry");
  packed.set(name, payload.subarray(offset + 512, offset + 512 + size));
  offset += 512 + Math.ceil(size / 512) * 512;
}
assert.deepEqual([...packed.keys()].sort(), [
  "package/README.md",
  "package/index.cjs",
  "package/package.json",
]);
for (const name of ["README.md", "index.cjs", "package.json"]) {
  assert.deepEqual(
    packed.get(`package/${name}`),
    readFileSync(new URL(`../../tooling/minimatch-compat/${name}`, import.meta.url)),
    `Packed lint adapter differs from readable ${name}; repack it and update package-lock.json`,
  );
}

// Exercise Node's ESM named-export boundary and the actual modern ESM consumer.
const esmMatcher = await import("minimatch");
assert.equal(esmMatcher.Minimatch, minimatch.Minimatch);
assert.equal(new esmMatcher.Minimatch("src/**").match("src/esm.ts"), true);
assert.equal(esmMatcher.minimatch("a.ts", "*.ts"), true);
assert.equal(esmMatcher.defaults({ nocase: true })("ABC", "abc"), true);
assert.deepEqual(["a.ts", "b.js"].filter(esmMatcher.filter("*.ts")), ["a.ts"]);
const { ConfigArray } = await import("@eslint/config-array");
const modernConfig = new ConfigArray([{ files: ["**/*.js"], rules: { demo: "error" } }], {
  basePath: process.cwd(),
  schema: { rules: { merge: "assign", validate: "object" } },
});
await modernConfig.normalize();
assert.deepEqual(modernConfig.getConfig(`${process.cwd()}/esm.js`).rules, { demo: "error" });
assert.equal(modernConfig.getConfig(`${process.cwd()}/esm.txt`), undefined);

// Cover the actual legacy callable, modern named/class and defaults contracts.
assert.equal(minimatch("src/a.ts", "src/*.{ts,tsx}"), true);
assert.equal(minimatch.minimatch("src/.a.ts", "src/*.ts"), false);
assert.equal(new minimatch.Minimatch("src/**").match("src/a/b.ts"), true);
assert.equal(minimatch.defaults({ nocase: true })("COMPONENT", "component"), true);
assert.deepEqual(["a.ts", "b.js"].filter(minimatch.filter("*.ts")), ["a.ts"]);
assert.deepEqual(minimatch.match(["a.ts", "b.js"], "*.js"), ["b.js"]);
// Only import/no-internal-modules uses makeRe, and only its .test() method.
assert.equal(minimatch.makeRe("blocked/**").test("blocked/private"), true);
assert.equal(minimatch.makeRe("blocked/**").test("allowed/public"), false);

const plugins = {
  react: requireNext("eslint-plugin-react"),
  import: requireNext("eslint-plugin-import"),
  "jsx-a11y": requireNext("eslint-plugin-jsx-a11y"),
};
async function checkRule(rule, options, code, expected) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: fixupConfigRules([
      {
        files: ["**/*.jsx"],
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins,
        settings: { react: { version: "19.3.1" } },
        rules: { [rule]: ["error", options] },
      },
    ]),
  });
  const [result] = await eslint.lintText(code, { filePath: "lint-compat.jsx" });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  assert.equal(result.messages.length, expected, JSON.stringify(result.messages));
  assert.ok(result.messages.every((message) => message.ruleId === rule));
}
await checkRule(
  "react/jsx-pascal-case",
  { ignore: ["Ignored_*"] },
  "const view = <><Ignored_widget /><Broken_widget /></>;",
  1,
);
await checkRule(
  "import/no-unassigned-import",
  { allow: ["**/*.css"] },
  'import "./style.css"; import "./startup.js";',
  1,
);
await checkRule(
  "import/no-internal-modules",
  { forbid: ["blocked/**"] },
  'import bad from "blocked/private"; import good from "allowed/public";',
  1,
);
await checkRule(
  "jsx-a11y/label-has-associated-control",
  { controlComponents: ["Custom*"], assert: "nesting" },
  "const view = <label>Name<CustomInput /></label>;",
  0,
);
await checkRule(
  "jsx-a11y/label-has-associated-control",
  { controlComponents: ["Other*"], assert: "nesting" },
  "const view = <label>Name<CustomInput /></label>;",
  1,
);

// A small adversarial glob must finish in a separately bounded process. No
// vulnerable legacy matcher is executed, and there is no server/load traffic.
const bounded = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const match = require("@tic-tac-toe/minimatch-compat");
if (match("a".repeat(200) + "b", ("a*".repeat(40) + "a"))) process.exit(1);
if (match.makeRe(("a*".repeat(40) + "a")).test("a".repeat(200) + "b")) process.exit(1);`,
  ],
  { encoding: "utf8", timeout: 2000 },
);
assert.ifError(bounded.error);
assert.equal(bounded.status, 0, bounded.stderr);
console.log("Lint compatibility: patched glob APIs and React/import/a11y rules passed.");
