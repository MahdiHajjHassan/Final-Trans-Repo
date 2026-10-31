import { spawnSync } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { resolve, join, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
const manifestName = "source-manifest.json";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function safe(root, path) {
  const result = resolve(root, path),
    rel = relative(root, result);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Unsafe source path");
  return result;
}
export async function sourceFiles(root = process.cwd()) {
  const git = spawnSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  let files;
  if (git.status === 0) files = [...new Set(git.stdout.split("\0").filter(Boolean))].sort();
  else {
    const manifest = JSON.parse(await readFile(join(root, manifestName), "utf8"));
    files = manifest.files.map((f) => f.path);
    for (const file of manifest.files)
      if (hash(await readFile(safe(root, file.path))) !== file.sha256)
        throw new Error("Source integrity failed: " + file.path);
  }
  const present = [];
  for (const path of files) {
    const file = safe(root, path);
    let stat;
    try {
      stat = await lstat(file);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error("Source export refuses non-file: " + path);
    present.push(path);
  }
  return present;
}
