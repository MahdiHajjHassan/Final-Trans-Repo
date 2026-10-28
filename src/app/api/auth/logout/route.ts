import { handleAuth } from "@/backend/services";
export function POST(request: Request) {
  return handleAuth("logout", request);
}
