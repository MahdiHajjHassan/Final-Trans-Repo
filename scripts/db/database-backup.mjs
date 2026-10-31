import { backupDatabase, restoreDatabase } from "../lib/database-backup.mjs";

const [operation, source, target, ...extra] = process.argv.slice(2);
if (!["backup", "restore"].includes(operation) || !source || !target || extra.length) {
  console.error(
    "Usage: node scripts/db/database-backup.mjs <backup|restore> <source.db> <new-target.db>",
  );
  process.exitCode = 1;
} else {
  try {
    await (operation === "backup" ? backupDatabase : restoreDatabase)(source, target);
    console.log("Validated database snapshot written to the new destination.");
  } catch (error) {
    console.error("Database operation failed:", error.message);
    process.exitCode = 1;
  }
}
