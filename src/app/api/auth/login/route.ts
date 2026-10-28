import { handleAuth } from "@/backend/services";

// POST /api/auth/login: check credentials and issue the session cookie.
export function POST(request: Request) {
  return handleAuth("login", request);
}
