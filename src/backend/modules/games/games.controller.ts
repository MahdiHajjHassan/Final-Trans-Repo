import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import type { ServerConfig } from "../../config/env";
import { DomainError } from "../../common/errors";
import { handleApi, jsonData } from "../../common/http";
import { readJson, requireSameOrigin } from "../../common/security/origin";
import type { GameService } from "./games.service";

// The game routes: read JSON, find the session user and pass the action to the service.
export function createGameHandlers(
  games: GameService,
  auth: AuthService,
  config: Pick<ServerConfig, "appOrigin">,
) {
  const actor = (request: Request) => requestActor(request, auth);

  // Checks Origin before reading the JSON for a game write.
  async function body(request: Request) {
    requireSameOrigin(request, config.appOrigin);
    return readJson(request);
  }
  return {
    // POST /api/games: start a computer game or open a friend room.
    create: (request: Request) =>
      handleApi(async () => {
        const input = await body(request);
        return jsonData(await games.create(await actor(request), input), 201);
      }),

    // POST /api/games/join: take the free seat using a room code.
    join: (request: Request) =>
      handleApi(async () => {
        const input = await body(request);
        return jsonData(await games.join(await actor(request), input));
      }),

    // GET /api/games/:id: the board and the caller's place in it.
    read: (request: Request, id: string) =>
      handleApi(async () => jsonData(await games.read(await actor(request), id))),

    // GET /api/games: this player's game history. Repeated query keys are rejected.
    list: (request: Request) =>
      handleApi(async () => {
        const params = new URL(request.url).searchParams;
        if (new Set(params.keys()).size !== [...params.keys()].length)
          throw new DomainError("VALIDATION");
        return jsonData(await games.listMine(await actor(request), Object.fromEntries(params)));
      }),

    // POST /api/games/:id/moves: the cell and the version the player saw.
    move: (request: Request, id: string) =>
      handleApi(async () => {
        const input = await body(request);
        return jsonData(await games.move(await actor(request), id, input));
      }),

    // POST /api/games/:id/resign: give up an active game.
    resign: (request: Request, id: string) =>
      handleApi(async () => {
        const input = await body(request);
        return jsonData(await games.resign(await actor(request), id, input));
      }),

    // POST /api/games/:id/cancel: close a room before an opponent joins.
    cancel: (request: Request, id: string) =>
      handleApi(async () => {
        const input = await body(request);
        return jsonData(await games.cancel(await actor(request), id, input));
      }),
  };
}
