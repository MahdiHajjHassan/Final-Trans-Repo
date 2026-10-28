import { handleAuth } from "@/backend/services";

// POST /api/auth/logout: revoke this session and clear its cookie.
export function POST(request: Request) {
  return handleAuth("logout", request);
}
