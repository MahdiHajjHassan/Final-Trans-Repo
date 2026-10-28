import { handleGame } from "@/backend/services";

// GET /api/games/:id: load the saved game for one of its players.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("read", request, (await params).id);
}
