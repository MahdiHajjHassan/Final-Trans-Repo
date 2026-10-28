import { handleGame } from "@/backend/services";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleGame("read", request, (await params).id);
}
