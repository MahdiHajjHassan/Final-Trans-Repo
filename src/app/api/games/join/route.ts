import { handleGame } from "@/backend/services";

// POST /api/games/join: join a friend room using its invitation code.
export const POST = (request: Request) => handleGame("join", request);
