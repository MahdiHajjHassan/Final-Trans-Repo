import { withServices } from "@/backend/services";
import { createPresenceHandlers } from "@/backend/modules/presence/presence.controller";
// POST /api/account/presence: update only the session named by the secure cookie.
export function POST(r: Request) {
  return withServices((s) => createPresenceHandlers(s.presence, s.config).heartbeat(r));
}
