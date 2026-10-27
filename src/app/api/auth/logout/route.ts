import { handleAuth } from "@/server/services";
export function POST(request: Request) { return handleAuth("logout", request); }
