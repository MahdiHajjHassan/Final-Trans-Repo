import { test, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("source enumeration includes uncommitted additions and edits, omits deletions and ignored credentials", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-test-"));
  const source = join(root, "source");
  try {
    await mkdir(source);
    spawnSync("git", ["init", "-q", source]);
    await writeFile(join(source, ".gitignore"), ".env\nnode_modules/\n");
    await writeFile(join(source, "edited.ts"), "old");
    await writeFile(join(source, "deleted.ts"), "gone");
    spawnSync("git", ["-C", source, "add", "."]);
    await writeFile(join(source, "edited.ts"), "changed\n");
    await writeFile(join(source, "new.ts"), "new\n");
    await writeFile(join(source, ".env"), "ADMIN_PASSWORD=private-fixture\n");
    const { unlink } = await import("node:fs/promises");
    await unlink(join(source, "deleted.ts"));
    const { sourceFiles } = await import("../../scripts/lib/source.mjs");
    expect(await sourceFiles(source)).toEqual([".gitignore", "edited.ts", "new.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source enumeration handles a tracked route directory replaced by a static file", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-static-source-test-"));
  const source = join(root, "source");
  try {
    await mkdir(join(source, "icon"), { recursive: true });
    spawnSync("git", ["init", "-q", source]);
    await writeFile(join(source, "icon", "route.ts"), "old route");
    spawnSync("git", ["-C", source, "add", "."]);
    await rm(join(source, "icon"), { recursive: true });
    const bytes = Buffer.from([0, 0, 1, 0, 1, 0]);
    await writeFile(join(source, "icon"), bytes);
    const { sourceFiles } = await import("../../scripts/lib/source.mjs");
    expect(await sourceFiles(source)).toEqual(["icon"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Git-less source enumeration reads an explicit SHA-256 manifest and rejects tampering", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-manifest-test-"));
  try {
    const bytes = "fixture source\n";
    await writeFile(join(root, "fixture.ts"), bytes);
    await writeFile(
      join(root, "source-manifest.json"),
      JSON.stringify({
        kind: "uncommitted-working-source",
        files: [{ path: "fixture.ts", sha256: createHash("sha256").update(bytes).digest("hex") }],
      }),
    );
    const { sourceFiles } = await import("../../scripts/lib/source.mjs");
    expect(await sourceFiles(root)).toEqual(["fixture.ts"]);
    await writeFile(join(root, "fixture.ts"), "tampered");
    await expect(sourceFiles(root)).rejects.toThrow("Source integrity failed: fixture.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
