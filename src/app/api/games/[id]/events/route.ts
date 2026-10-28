import { withServices } from "@/server/services";
import { createGameStream } from "@/server/games/stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((current) => createGameStream(request, id, current));
}
