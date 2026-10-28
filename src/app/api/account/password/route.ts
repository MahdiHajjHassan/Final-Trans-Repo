import { handleAuth } from "@/backend/services";
export function PUT(request: Request) {
  return handleAuth("changePassword", request);
}
