import { handleGame } from "@/backend/services";

// POST /api/games/:id/cancel: the creator closes an unjoined room.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("cancel", request, (await params).id);
}
