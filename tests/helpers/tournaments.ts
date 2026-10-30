import type { PrismaClient } from "@/generated/prisma/client";
import { seedUser } from "./fixtures";
import { createTournamentService } from "@/backend/modules/tournaments/tournaments.service";

export async function startFour(db: PrismaClient) {
  const players = await Promise.all(
    ["One", "Two", "Three", "Four"].map((displayName) => seedUser(db, { displayName })),
  );
  const tournaments = createTournamentService(db);
  let event = await tournaments.create(players[0].actor, {});
  const code = event.inviteCode;
  for (const player of players.slice(1)) event = await tournaments.join(player.actor, { code });
  event = await tournaments.start(players[0].actor, event.id, { expectedVersion: event.version });
  return { players, tournaments, event };
}
