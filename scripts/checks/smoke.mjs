import assert from "node:assert/strict";
import { verifiedJson } from "../lib/http.mjs";

assert.deepEqual(await verifiedJson("/api/health"), { status: "ok", database: "ok" });
console.log("HTTPS readiness and migrated database verified.");
