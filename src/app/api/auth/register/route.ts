import { handleAuth } from "@/backend/services";
export function POST(request: Request) {
  return handleAuth("register", request);
}
