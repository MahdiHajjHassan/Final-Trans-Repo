import type { Player } from "./games";
import type { Dictionary } from "@/i18n/dictionaries";
export function playerLabel(player: Player, t: Dictionary): string {
  if (!player) return t.WAITING;
  return player.kind === "AI"
    ? t.computer
    : player.kind === "DELETED"
      ? t.deletedPlayer
      : player.displayName;
}
