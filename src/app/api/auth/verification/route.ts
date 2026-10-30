import { handleAuth } from "@/backend/services";

// GET /api/auth/verification: pending email verification, never a login bypass.
export function GET(request: Request) {
  return handleAuth("verificationRead", request);
}
