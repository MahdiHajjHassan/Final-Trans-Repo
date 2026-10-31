import assert from "node:assert/strict";
import { verifiedJson } from "../lib/https.mjs";

assert.deepEqual(await verifiedJson("/api/health"), { status: "ok", database: "ok" });
console.log("HTTPS readiness and migrated database verified.");
