import { withServices } from "@/backend/services";
import { createTournamentHandlers } from "@/backend/modules/tournaments/tournaments.controller";
// POST /api/tournaments/:id/leave: recheck caller and lobby version.
export async function POST(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) =>
    createTournamentHandlers(s.tournaments, s.auth, s.config).leave(r, id),
  );
}
