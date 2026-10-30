import { withServices } from "@/backend/services";
import { createTournamentHandlers } from "@/backend/modules/tournaments/tournaments.controller";
// GET/POST /api/tournaments: own events or a new four-player lobby.
export function GET(r: Request) {
  return withServices((s) => createTournamentHandlers(s.tournaments, s.auth, s.config).list(r));
}
export function POST(r: Request) {
  return withServices((s) => createTournamentHandlers(s.tournaments, s.auth, s.config).create(r));
}
