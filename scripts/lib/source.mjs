import { spawnSync } from "node:child_process";
import { lstat, realpath, readFile, readdir, mkdir, copyFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";

const manifestName = "source-manifest.json";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const excludedDirectories = new Set([
  ".git",
  ".worktrees",
  ".logs",
  ".agents",
  ".codex",
  ".superpowers",
  ".impeccable",
  "node_modules",
  ".next",
  "out",
  "data",
  "backups",
  "local-certs",
  "coverage",
  "test-results",
  "playwright-report",
]);

// This boundary applies equally to tracked files, raw ZIPs and supplied manifests.
export function privateSourcePath(path) {
  const parts = path.split("/");
  return (
    parts.some((part) => excludedDirectories.has(part)) ||
    (parts.some((part) => /^\.env/.test(part)) && path !== ".env.example") ||
    /\.(?:db|sqlite3?)(?:[.-]|$)|\.(?:pem|key|p12|pfx|tsbuildinfo)$/.test(path) ||
    /^(?:src\/generated\/prisma|playwright\/\.auth|docs\/(?:superpowers|team|evaluation|delivery|requirements))(?:\/|$)/.test(
      path,
    ) ||
    /(?:^|\/)(?:\.DS_Store|AGENTS\.md|CLAUDE\.md|PRODUCT\.md|DESIGN\.md)$/.test(path)
  );
}

function safe(root, path) {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    isAbsolute(path)
  )
    throw new Error("Unsafe source path");
  const result = resolve(root, path),
    rel = relative(root, result);
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    throw new Error("Unsafe source path");
  return result;
}

async function regularSourceFile(root, path) {
  const parts = path.split("/");
  for (let index = 0; index < parts.length; index++) {
    const stat = await lstat(join(root, ...parts.slice(0, index + 1)));
    if (index < parts.length - 1 && stat.isFile())
      throw Object.assign(new Error("Source ancestor is no longer a directory"), {
        code: "ENOTDIR",
      });
    if (
      stat.isSymbolicLink() ||
      (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
    )
      throw new Error("Source export refuses symlink or non-file: " + path);
  }
}

async function enumerate(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (path === manifestName || privateSourcePath(path)) continue;
    safe(root, path);
    if (entry.isDirectory()) files.push(...(await enumerate(root, path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error("Source export refuses symlink or non-file: " + path);
  }
  return files.sort();
}

export async function sourceFiles(root = process.cwd()) {
  root = resolve(root);
  if ((await realpath(root)) !== root || !(await lstat(root)).isDirectory())
    throw new Error("Source root must be a real directory");
  const gitRoot = spawnSync("git", ["-C", root, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  const inGit = gitRoot.status === 0 && resolve(gitRoot.stdout.trim()) === root;
  let files,
    manifest,
    hasManifest = false;
  if (inGit) {
    const git = spawnSync(
      "git",
      ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    );
    if (git.status !== 0) throw new Error("Cannot enumerate Git source");
    const tracked = spawnSync("git", ["-C", root, "ls-files", "--cached", "-z"], {
      encoding: "utf8",
    });
    if (tracked.status !== 0) throw new Error("Cannot inspect tracked Git source");
    for (const path of tracked.stdout.split("\0").filter(Boolean)) {
      if (!privateSourcePath(path)) continue;
      try {
        await lstat(safe(root, path));
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
        throw error;
      }
      throw new Error("Private/generated artifact tracked in source: " + path);
    }
    files = [...new Set(git.stdout.split("\0").filter(Boolean))]
      .filter((path) => path !== manifestName && !privateSourcePath(path))
      .sort();
  } else {
    try {
      await regularSourceFile(root, manifestName);
      manifest = JSON.parse(await readFile(join(root, manifestName), "utf8"));
      hasManifest = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!hasManifest) return enumerate(root);
    if (!manifest || !Array.isArray(manifest.files)) throw new Error("Invalid source manifest");
    files = manifest.files.map((file) => {
      safe(root, file?.path);
      if (file.path === manifestName || privateSourcePath(file.path))
        throw new Error("Private or recursive source manifest path: " + file.path);
      if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("Invalid source manifest hash");
      return file.path;
    });
    if (new Set(files).size !== files.length) throw new Error("Duplicate source manifest path");
  }
  const present = [];
  for (const path of files) {
    safe(root, path);
    try {
      await regularSourceFile(root, path);
    } catch (error) {
      // Git indexes may retain deleted files or directories replaced by ordinary files.
      if (!manifest && (error.code === "ENOENT" || error.code === "ENOTDIR")) continue;
      throw error;
    }
    present.push(path);
  }
  if (manifest) {
    for (const file of manifest.files)
      if (hash(await readFile(safe(root, file.path))) !== file.sha256)
        throw new Error("Source integrity failed: " + file.path);
  }
  return present;
}

export async function copyWorkingSource(source, target) {
  source = resolve(source);
  target = resolve(target);
  const rel = relative(source, target);
  if (!rel || (!rel.startsWith("../") && !isAbsolute(rel)))
    throw new Error("Source copy target must be outside the source tree");
  const paths = await sourceFiles(source);
  for (let ancestor = target; ; ancestor = dirname(ancestor)) {
    try {
      if ((await lstat(ancestor)).isSymbolicLink())
        throw new Error("Source copy refuses symlink target ancestors");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(ancestor) === ancestor) break;
  }
  await mkdir(target, { recursive: true });
  if (
    (await realpath(target)) !== target ||
    !(await lstat(target)).isDirectory() ||
    (await readdir(target)).length
  )
    throw new Error("Source copy target must be an empty real directory");
  const files = [];
  for (const path of paths) {
    const from = safe(source, path),
      to = safe(target, path);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    files.push({ path, sha256: hash(await readFile(to)) });
  }
  const manifest = { kind: "uncommitted-working-source", files };
  await writeFile(join(target, manifestName), JSON.stringify(manifest, null, 2));
  return manifest;
}
