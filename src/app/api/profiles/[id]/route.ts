import { withServices } from "@/backend/services";
import { createProfileHandlers } from "@/backend/modules/profiles/profiles.controller";
// GET /api/profiles/:id: public member details and this caller's relationship only.
export async function GET(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withServices((s) => createProfileHandlers(s.profiles, s.friends, s.auth).read(r, id));
}
