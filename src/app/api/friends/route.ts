import { withServices } from "@/backend/services";
import { createFriendHandlers } from "@/backend/modules/friends/friends.controller";
// GET/POST /api/friends: list relationships or request a friendship.
export function GET(r: Request) {
  return withServices((s) => createFriendHandlers(s.friends, s.auth, s.config).list(r));
}
export function POST(r: Request) {
  return withServices((s) => createFriendHandlers(s.friends, s.auth, s.config).request(r));
}
