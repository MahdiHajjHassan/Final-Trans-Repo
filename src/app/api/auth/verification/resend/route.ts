import { handleAuth } from "@/backend/services";

// POST /api/auth/verification/resend: pending email verification, never a login bypass.
export function POST(request: Request) {
  return handleAuth("verificationResend", request);
}
