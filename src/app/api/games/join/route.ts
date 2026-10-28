import { handleGame } from "@/backend/services";
export const POST = (request: Request) => handleGame("join", request);
