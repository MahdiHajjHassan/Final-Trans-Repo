import "dotenv/config";
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { resolveDatabaseUrl } from "../src/backend/config/env";
import { createDb } from "../src/backend/database/db";
import { setAccountEmail } from "../src/backend/modules/auth/email/change-email";

// Operator-only console command; no public route or verification bypass is installed.
const { values } = parseArgs({
  options: { "current-email": { type: "string" }, "new-email": { type: "string" } },
  strict: true,
});
if (!values["current-email"] || !values["new-email"] || !process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL and supply --current-email and --new-email");
const url = resolveDatabaseUrl(process.env.DATABASE_URL);
if (!existsSync(url.slice(5)))
  throw new Error("The selected database must already exist and be migrated");
const db = await createDb(url);
try {
  await setAccountEmail(db, values["current-email"], values["new-email"]);
  console.log(
    "Account email updated. Verification is required; previous sessions were revoked. Account and games preserved.",
  );
} finally {
  await db.$disconnect();
}
