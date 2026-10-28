import { handleAuth } from "@/backend/services";

// PUT /api/account/password: replace the password and revoke the account's sessions.
export function PUT(request: Request) {
  return handleAuth("changePassword", request);
}
