import { createHash } from "node:crypto";
// Only a correctly formatted cookie can identify an existing session row.
export function sessionTokenHash(raw: string | null): string | null {
  return raw !== null && /^[a-f0-9]{64}$/.test(raw)
    ? createHash("sha256").update(raw).digest("hex")
    : null;
}
