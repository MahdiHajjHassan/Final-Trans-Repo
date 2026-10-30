import type { Prisma } from "@/generated/prisma/client";

// Preserve ordinary admin deletion without manufacturing tournament winners or orphaned games.
export async function cancelTournamentsForUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ id: string; version: number }[]> {
  const rows = await tx.tournament.findMany({
    where: {
      status: { in: ["LOBBY", "RUNNING"] },
      OR: [{ hostId: userId }, { entries: { some: { userId } } }],
    },
  });
  const changed: { id: string; version: number }[] = [];
  for (const row of rows) {
    if (row.status === "LOBBY" && row.hostId !== userId) {
      await tx.tournamentEntry.deleteMany({ where: { tournamentId: row.id, userId } });
      await tx.tournament.update({ where: { id: row.id }, data: { version: { increment: 1 } } });
      continue;
    }
    const time = new Date();
    await tx.tournament.update({
      where: { id: row.id },
      data: {
        status: "CANCELLED",
        championSlot: null,
        finishedAt: time,
        version: { increment: 1 },
      },
    });
    await tx.tournamentMatch.updateMany({
      where: { tournamentId: row.id, status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    const games = await tx.game.findMany({
      where: { tournamentMatch: { tournamentId: row.id }, status: { in: ["WAITING", "ACTIVE"] } },
      select: { id: true, version: true },
    });
    if (games.length) {
      await tx.game.updateMany({
        where: { id: { in: games.map((game) => game.id) } },
        data: {
          status: "CANCELLED",
          reason: "TOURNAMENT_CANCELLED",
          winner: null,
          turn: null,
          finishedAt: time,
          version: { increment: 1 },
        },
      });
      changed.push(...games.map((game) => ({ id: game.id, version: game.version + 1 })));
    }
  }
  return changed;
}
