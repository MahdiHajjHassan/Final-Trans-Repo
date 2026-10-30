import { handleAuth } from "@/backend/services";

// POST /api/auth/verification/confirm: pending email verification, never a login bypass.
export function POST(request: Request) {
  return handleAuth("verificationConfirm", request);
}
