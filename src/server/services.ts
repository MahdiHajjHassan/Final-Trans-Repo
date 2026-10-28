import { getDb } from "./db";
import { loadConfig } from "./config";
import { createAuthService } from "./auth/service";
import { createAuthHandlers } from "./auth/http";
import { apiError, handleApi } from "./api/http";
import { createUserService } from "./users/service";
import { createGameService } from "./games/service";
import { createGameHandlers } from "./games/http";
import { gameEvents } from "./games/events";
async function buildServices() {
  const db = await getDb(),
    config = loadConfig(process.env);
  return {
    db,
    config,
    auth: createAuthService(db),
    games: createGameService(db, { publish: gameEvents.publish }),
    users: createUserService(db, { publish: gameEvents.publish }),
  };
}
let services: ReturnType<typeof buildServices> | undefined;
export function getServices() {
  services ??= buildServices().catch((error) => {
    services = undefined;
    throw error;
  });
  return services;
}
export function withServices(
  operation: (current: Awaited<ReturnType<typeof getServices>>) => Promise<Response>,
) {
  return handleApi(async () => operation(await getServices()));
}
export async function handleAuth(
  action: keyof ReturnType<typeof createAuthHandlers>,
  request: Request,
): Promise<Response> {
  try {
    const current = await getServices();
    return createAuthHandlers(current.auth, current.config)[action](request);
  } catch (error) {
    return apiError(error);
  }
}
export async function handleGame(
  action: keyof ReturnType<typeof createGameHandlers>,
  request: Request,
  id?: string,
): Promise<Response> {
  try {
    const current = await getServices(),
      handlers = createGameHandlers(current.games, current.auth, current.config);
    if (action === "read" || action === "move" || action === "resign" || action === "cancel")
      return handlers[action](request, id ?? "");
    return handlers[action](request);
  } catch (error) {
    return apiError(error);
  }
}
