import { handleGame } from "@/backend/services";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("move", request, (await params).id);
}
