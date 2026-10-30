import { withServices } from "@/backend/services";
import { createProfileHandlers } from "@/backend/modules/profiles/profiles.controller";
// GET /api/profiles: authenticated public-name discovery.
export function GET(r: Request) {
  return withServices((s) => createProfileHandlers(s.profiles, s.friends, s.auth).search(r));
}
