import { handleAuth } from "@/backend/services";

// POST /api/auth/register: account creation; the auth controller handles the response.
export function POST(request: Request) {
  return handleAuth("register", request);
}
