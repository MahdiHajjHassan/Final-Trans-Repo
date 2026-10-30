import { withServices } from "@/backend/services";
import { createTournamentHandlers } from "@/backend/modules/tournaments/tournaments.controller";
// GET /api/tournaments/:id: bracket metadata for a registered participant.
export async function GET(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) => createTournamentHandlers(s.tournaments, s.auth, s.config).read(r, id));
}
