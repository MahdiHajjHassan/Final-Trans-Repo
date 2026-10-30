import { randomInt } from "node:crypto";
// Room codes omit visually ambiguous characters and are never used as move authorization.
export function invitation() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
}
