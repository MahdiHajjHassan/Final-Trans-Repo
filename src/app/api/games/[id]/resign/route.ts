import { handleGame } from "@/backend/services";

// POST /api/games/:id/resign: give the other mark the win.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("resign", request, (await params).id);
}
