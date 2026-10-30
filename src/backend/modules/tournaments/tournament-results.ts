import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "../../common/errors";

// Called inside the terminal game write: a result and its next bracket state commit together.
export async function settleTournamentGame(
  tx: Prisma.TransactionClient,
  gameId: string,
): Promise<void> {
  const game = await tx.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { tournamentMatch: { include: { tournament: true, entryA: true, entryB: true } } },
  });
  const match = game.tournamentMatch;
  if (
    !match ||
    game.status !== "FINISHED" ||
    match.status !== "ACTIVE" ||
    match.tournament.status !== "RUNNING" ||
    game.tournamentAttempt !== match.attempt
  )
    return;
  if (!game.xId || !game.oId || !match.entryA || !match.entryB) throw new DomainError("CONFLICT");
  if (!game.winner) {
    if (game.reason !== "FULL_BOARD") throw new DomainError("CONFLICT");
    const changed = await tx.tournamentMatch.updateMany({
      where: { id: match.id, status: "ACTIVE", attempt: match.attempt, version: match.version },
      data: { attempt: { increment: 1 }, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new DomainError("CONFLICT");
    await tx.game.create({
      data: {
        mode: "HUMAN",
        status: "ACTIVE",
        xId: game.oId,
        oId: game.xId,
        tournamentMatchId: match.id,
        tournamentAttempt: match.attempt + 1,
      },
    });
    await tx.tournament.update({
      where: { id: match.tournamentId },
      data: { version: { increment: 1 } },
    });
    return;
  }
  const winnerId = game.winner === "X" ? game.xId : game.oId;
  const winner = [match.entryA, match.entryB].find((entry) => entry.userId === winnerId);
  if (!winner) throw new DomainError("CONFLICT");
  const changed = await tx.tournamentMatch.updateMany({
    where: { id: match.id, status: "ACTIVE", attempt: match.attempt, version: match.version },
    data: { status: "FINISHED", winnerEntryId: winner.id, version: { increment: 1 } },
  });
  if (changed.count !== 1) throw new DomainError("CONFLICT");
  if (match.slot === "FINAL") {
    await tx.tournament.update({
      where: { id: match.tournamentId },
      data: {
        status: "FINISHED",
        championSlot: winner.slot,
        finishedAt: game.finishedAt ?? new Date(),
        version: { increment: 1 },
      },
    });
    return;
  }
  await tx.tournament.update({
    where: { id: match.tournamentId },
    data: { version: { increment: 1 } },
  });
  const semis = await tx.tournamentMatch.findMany({
    where: { tournamentId: match.tournamentId, slot: { in: ["SF1", "SF2"] } },
    include: { winnerEntry: true },
    orderBy: { slot: "asc" },
  });
  if (
    semis.length !== 2 ||
    semis.some((row) => row.status !== "FINISHED" || !row.winnerEntry?.userId)
  )
    return;
  const final = await tx.tournamentMatch.findUniqueOrThrow({
    where: { tournamentId_slot: { tournamentId: match.tournamentId, slot: "FINAL" } },
  });
  if (final.status !== "PENDING") return;
  const started = await tx.tournamentMatch.updateMany({
    where: { id: final.id, status: "PENDING", version: final.version },
    data: {
      status: "ACTIVE",
      entryAId: semis[0].winnerEntryId,
      entryBId: semis[1].winnerEntryId,
      attempt: 1,
      version: { increment: 1 },
    },
  });
  if (started.count !== 1) throw new DomainError("CONFLICT");
  await tx.game.create({
    data: {
      mode: "HUMAN",
      status: "ACTIVE",
      xId: semis[0].winnerEntry!.userId,
      oId: semis[1].winnerEntry!.userId,
      tournamentMatchId: final.id,
      tournamentAttempt: 1,
    },
  });
}
