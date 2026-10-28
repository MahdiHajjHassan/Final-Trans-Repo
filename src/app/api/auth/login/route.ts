import { handleAuth } from "@/backend/services";
export function POST(request: Request) {
  return handleAuth("login", request);
}
