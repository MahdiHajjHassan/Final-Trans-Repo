import Sqlite from "better-sqlite3";
import { lstat, mkdir, mkdtemp, chmod, link, rm } from "node:fs/promises";
import { resolve, dirname, join, parse, relative } from "node:path";

async function exists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function refuseSymlinks(path) {
  const root = parse(path).root;
  let current = root;
  for (const part of relative(root, path).split("/")) {
    current = join(current, part);
    const stat = await exists(current);
    if (stat?.isSymbolicLink()) throw new Error("Database operation refuses symlinks");
  }
}

function integrity(database) {
  const checks = database.pragma("integrity_check");
  if (
    checks.length !== 1 ||
    checks[0].integrity_check !== "ok" ||
    database.pragma("foreign_key_check").length
  )
    throw new Error("Database integrity validation failed");
}

async function copyDatabase(source, target, privateBackup) {
  if (
    typeof source !== "string" ||
    !source ||
    typeof target !== "string" ||
    !target ||
    source.includes("\0") ||
    target.includes("\0")
  )
    throw new Error("Two database file paths are required");
  source = resolve(source);
  target = resolve(target);
  await refuseSymlinks(source);
  await refuseSymlinks(target);
  if (!(await exists(source))?.isFile())
    throw new Error("Source database must be an existing regular file");
  for (const suffix of ["", "-wal", "-shm", "-journal"])
    if (await exists(target + suffix))
      throw new Error("Destination or SQLite sidecar already exists");
  const database = new Sqlite(source, { readonly: true, fileMustExist: true, timeout: 5000 });
  let temporary;
  try {
    integrity(database);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    if (privateBackup && (await lstat(dirname(target))).mode & 0o077)
      throw new Error("Backup directory must be private (chmod 700)");
    temporary = await mkdtemp(join(dirname(target), ".sqlite-backup-"));
    const snapshot = join(temporary, "snapshot.db");
    // SQLite's online backup API reads a consistent snapshot, including committed WAL pages.
    await database.backup(snapshot);
    await chmod(snapshot, 0o600);
    const check = new Sqlite(snapshot, { fileMustExist: true });
    try {
      // Produce one portable file, with no WAL or SHM sidecars needed for restoration.
      check.pragma("journal_mode = DELETE");
      integrity(check);
    } finally {
      check.close();
    }
    for (const suffix of ["-wal", "-shm", "-journal"])
      if (await exists(target + suffix))
        throw new Error("Destination SQLite sidecar already exists");
    // Publishing a hard link is atomic and refuses an existing target, unlike rename/copy.
    await link(snapshot, target);
  } finally {
    database.close();
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}

export function backupDatabase(source, target) {
  return copyDatabase(source, target, true);
}

// Restore deliberately stages a new file; replacing a live application database is unsupported.
export function restoreDatabase(source, target) {
  return copyDatabase(source, target, false);
}
