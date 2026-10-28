import { handleAuth } from "@/backend/services";

// GET /api/account: the signed-in account.
export function GET(request: Request) {
  return handleAuth("account", request);
}

// PATCH /api/account: change the signed-in user's display name.
export function PATCH(request: Request) {
  return handleAuth("updateAccount", request);
}
