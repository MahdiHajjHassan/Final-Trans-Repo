import type { Prisma } from "@/generated/prisma/client";
import type { TournamentDTO } from "@/shared/tournaments";
import { publicProfileSelect, publicProfile } from "../profiles/profile-view";
export const tournamentInclude = {
  entries: { include: { user: { select: publicProfileSelect } }, orderBy: { slot: "asc" } },
  matches: {
    include: {
      games: {
        select: { id: true, tournamentAttempt: true },
        orderBy: { tournamentAttempt: "desc" },
        take: 1,
      },
    },
  },
} satisfies Prisma.TournamentInclude;
export type TournamentRecord = Prisma.TournamentGetPayload<{ include: typeof tournamentInclude }>;
// Every member sees the fixed bracket, but only the host sees the open registration code.
export function tournamentDto(row: TournamentRecord, viewer: string): TournamentDTO {
  const order = ["SF1", "SF2", "FINAL"];
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    hostId: row.hostId,
    championSlot: row.championSlot as 1 | 2 | 3 | 4 | null,
    inviteCode: row.hostId === viewer && row.status === "LOBBY" ? row.joinCode : null,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    entries: row.entries.map((entry) => ({
      id: entry.id,
      slot: entry.slot as 1 | 2 | 3 | 4,
      profile: entry.user ? publicProfile(entry.user) : null,
    })),
    matches: [...row.matches]
      .sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot))
      .map((m) => ({
        id: m.id,
        slot: m.slot,
        status: m.status,
        version: m.version,
        entryAId: m.entryAId,
        entryBId: m.entryBId,
        winnerEntryId: m.winnerEntryId,
        attempt: m.attempt,
        currentGameId: m.games[0]?.id ?? null,
      })),
  };
}
