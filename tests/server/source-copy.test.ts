import { test, expect } from "vitest";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("working-source export includes uncommitted additions and edits, omits deletions and ignored credentials", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-test-"));
  try {
    const source = join(root, "source"),
      target = join(root, "copy");
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
    const { copyWorkingSource, sourceFiles } = await import("../../scripts/lib/source.mjs");
    const manifest = await copyWorkingSource(source, target);
    expect(await readFile(join(target, "edited.ts"), "utf8")).toBe("changed\n");
    expect(await readFile(join(target, "new.ts"), "utf8")).toBe("new\n");
    expect(manifest.files.map((f: { path: string }) => f.path).sort()).toEqual([
      ".gitignore",
      "edited.ts",
      "new.ts",
    ]);
    expect(await sourceFiles(target)).toEqual(manifest.files.map((f: { path: string }) => f.path));
    await writeFile(join(target, "new.ts"), "tampered");
    await expect(sourceFiles(target)).rejects.toThrow(/integrity/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("working-source export handles a tracked route directory replaced by a static file", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-static-source-test-"));
  const source = join(root, "source"),
    target = join(root, "copy");
  try {
    await mkdir(join(source, "icon"), { recursive: true });
    spawnSync("git", ["init", "-q", source]);
    await writeFile(join(source, "icon", "route.ts"), "old route");
    spawnSync("git", ["-C", source, "add", "."]);
    await rm(join(source, "icon"), { recursive: true });
    const bytes = Buffer.from([0, 0, 1, 0, 1, 0]);
    await writeFile(join(source, "icon"), bytes);
    const { copyWorkingSource, sourceFiles } = await import("../../scripts/lib/source.mjs");
    const manifest = await copyWorkingSource(source, target);
    expect(manifest.files.map((f: { path: string }) => f.path)).toEqual(["icon"]);
    expect(await readFile(join(target, "icon"))).toEqual(bytes);
    expect(await sourceFiles(target)).toEqual(["icon"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("raw ZIP source exports without Git or a manifest and excludes private/generated files", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-raw-source-test-"));
  try {
    const source = join(root, "source");
    await mkdir(source);
    const paths = [
      "src/app.ts",
      ".env.example",
      ".env",
      "data/live.db",
      "node_modules/package/index.js",
      ".next/static/app.js",
      "src/generated/prisma/client.ts",
      "local-certs/root.key",
      "playwright/.auth/member.json",
      "backups/private.db",
      "docs/superpowers/plan.md",
      ".codex/session.json",
    ];
    for (const path of paths) {
      await mkdir(join(source, path, ".."), { recursive: true });
      await writeFile(join(source, path), path);
    }
    const { sourceFiles, copyWorkingSource } = await import("../../scripts/lib/source.mjs");
    expect(await sourceFiles(source)).toEqual([".env.example", "src/app.ts"]);
    const manifest = await copyWorkingSource(source, join(root, "copy"));
    expect(manifest.files.map((file: { path: string }) => file.path)).toEqual([
      ".env.example",
      "src/app.ts",
    ]);
    expect(await sourceFiles(join(root, "copy"))).toEqual([".env.example", "src/app.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("copying a Git source with an existing manifest never recursively includes the manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-manifest-copy-test-"));
  try {
    spawnSync("git", ["init", "-q", root]);
    await writeFile(join(root, "app.ts"), "source");
    await writeFile(join(root, "source-manifest.json"), "old manifest");
    const { copyWorkingSource, sourceFiles } = await import("../../scripts/lib/source.mjs");
    const target = await mkdtemp(join(tmpdir(), "game-manifest-target-"));
    try {
      const manifest = await copyWorkingSource(root, target);
      expect(manifest.files.map((file: { path: string }) => file.path)).toEqual(["app.ts"]);
      expect(await sourceFiles(target)).toEqual(["app.ts"]);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  "../outside.ts",
  "/absolute.ts",
  "src/../../outside.ts",
  "src\\outside.ts",
  ".env",
  "node_modules/private.js",
  "source-manifest.json",
])("archive manifest refuses unsafe/private path %s before reading it", async (path) => {
  const root = await mkdtemp(join(tmpdir(), "game-unsafe-source-test-"));
  try {
    await writeFile(
      join(root, "source-manifest.json"),
      JSON.stringify({ files: [{ path, sha256: "a".repeat(64) }] }),
    );
    const { sourceFiles } = await import("../../scripts/lib/source.mjs");
    await expect(sourceFiles(root)).rejects.toThrow(/unsafe|private|manifest/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source export rejects symlinked ancestor directories in a manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-link-test-"));
  try {
    const { symlink } = await import("node:fs/promises");
    const { createHash } = await import("node:crypto");
    await mkdir(join(root, "source"));
    await mkdir(join(root, "outside"));
    await writeFile(join(root, "outside", "app.ts"), "secret");
    await symlink(join(root, "outside"), join(root, "source", "src"));
    await writeFile(
      join(root, "source", "source-manifest.json"),
      JSON.stringify({
        files: [
          { path: "src/app.ts", sha256: createHash("sha256").update("secret").digest("hex") },
        ],
      }),
    );
    const { sourceFiles } = await import("../../scripts/lib/source.mjs");
    await expect(sourceFiles(join(root, "source"))).rejects.toThrow(/symlink|non-file/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source audit works directly on an extracted ZIP before a public build exists", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-audit-test-"));
  try {
    await writeFile(join(root, "app.ts"), "source");
    await writeFile(join(root, ".env"), "ADMIN_PASSWORD=private-fixture");
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), "scripts/checks/audit-source.mjs")],
      {
        cwd: root,
        encoding: "utf8",
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/no public build output/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source audit checks configured secret values in public build files", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-build-audit-test-"));
  try {
    await mkdir(join(root, ".next/static"), { recursive: true });
    await writeFile(join(root, "app.ts"), "source");
    const secret = "private-fixture-value-42";
    await writeFile(join(root, ".next/static", "client.js"), `const leaked = '${secret}';`);
    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), "scripts/checks/audit-source.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, SMTP_PASSWORD: secret },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/SMTP_PASSWORD found in public build artifact/);
    expect(result.stderr).not.toContain(secret);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each([".env", "data/live.db", "node_modules/private.js"])(
  "Git source refuses an existing forced tracked private artifact %s",
  async (path) => {
    const root = await mkdtemp(join(tmpdir(), "game-tracked-private-source-test-"));
    try {
      spawnSync("git", ["init", "-q", root]);
      await mkdir(join(root, path, ".."), { recursive: true });
      await writeFile(join(root, path), "private-fixture");
      spawnSync("git", ["-C", root, "add", "-f", "--", path]);
      const { sourceFiles } = await import("../../scripts/lib/source.mjs");
      await expect(sourceFiles(root)).rejects.toThrow(/private|generated/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

test("source copy refuses a symlinked target ancestor before creating outside directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "game-source-target-link-test-"));
  try {
    const { symlink, readdir } = await import("node:fs/promises");
    await mkdir(join(root, "source"));
    await writeFile(join(root, "source", "app.ts"), "source");
    await mkdir(join(root, "outside"));
    await symlink(join(root, "outside"), join(root, "link"));
    const { copyWorkingSource } = await import("../../scripts/lib/source.mjs");
    await expect(
      copyWorkingSource(join(root, "source"), join(root, "link", "new-copy")),
    ).rejects.toThrow(/symlink|real directory/i);
    expect(await readdir(join(root, "outside"))).toEqual([]);
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
