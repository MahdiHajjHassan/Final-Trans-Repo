import { withServices } from "@/backend/services";
import { createAvatarHandlers } from "@/backend/modules/profiles/avatar.controller";

// GET /api/profiles/:id/avatar: authenticated canonical image or the local default.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) => createAvatarHandlers(s.avatars, s.auth, s.config).read(request, id));
}
