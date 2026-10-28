import { withServices } from "@/backend/services";
import { createGameStream } from "@/backend/modules/realtime/game-stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((current) => createGameStream(request, id, current));
}
