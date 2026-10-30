import { withServices } from "@/backend/services";
import { createTournamentHandlers } from "@/backend/modules/tournaments/tournaments.controller";
// POST /api/tournaments/join: claim a free registration slot using the lobby code.
export function POST(r: Request) {
  return withServices((s) => createTournamentHandlers(s.tournaments, s.auth, s.config).join(r));
}
