import { handleAuth } from "@/server/services";
export function PUT(request: Request) {
  return handleAuth("changePassword", request);
}
