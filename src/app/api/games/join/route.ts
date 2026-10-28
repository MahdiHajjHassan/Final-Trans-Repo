import { handleGame } from "@/server/services";
export const POST = (request: Request) => handleGame("join", request);
