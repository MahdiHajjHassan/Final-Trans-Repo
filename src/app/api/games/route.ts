import { handleGame } from "@/backend/services";
export const GET = (request: Request) => handleGame("list", request);
export const POST = (request: Request) => handleGame("create", request);
