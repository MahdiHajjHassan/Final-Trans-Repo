import type { Player } from "./games";
import type { Dictionary } from "@/shared/i18n/dictionaries";

/** Translate waiting/computer/deleted-player labels; keep a human player's chosen name. */
export function playerLabel(player: Player, t: Dictionary): string {
  if (!player) return t.WAITING;
  return player.kind === "AI"
    ? t.computer
    : player.kind === "DELETED"
      ? t.deletedPlayer
      : player.displayName;
}
