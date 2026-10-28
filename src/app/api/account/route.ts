import { handleAuth } from "@/backend/services";
export function GET(request: Request) {
  return handleAuth("account", request);
}
export function PATCH(request: Request) {
  return handleAuth("updateAccount", request);
}
