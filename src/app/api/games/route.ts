import { handleGame } from "@/backend/services";

// GET /api/games: the caller's paginated game history.
export const GET = (request: Request) => handleGame("list", request);

// POST /api/games: create a friend room or an active computer game.
export const POST = (request: Request) => handleGame("create", request);
