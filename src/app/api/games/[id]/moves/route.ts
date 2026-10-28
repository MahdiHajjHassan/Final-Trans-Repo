import { handleGame } from "@/backend/services";

// POST /api/games/:id/moves: play a cell against the version the caller saw.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("move", request, (await params).id);
}
