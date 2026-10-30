import { createVerificationService } from "./modules/auth/email/verification.service";
import { createVerificationSender } from "./modules/auth/email/verification-mail";
import { getDb } from "./database/db";
import { loadConfig } from "./config/env";
import { createAuthService } from "./modules/auth/auth.service";
import { createAuthHandlers } from "./modules/auth/auth.controller";
import { apiError, handleApi } from "./common/http";
import { createUserService } from "./modules/users/users.service";
import { createGameService } from "./modules/games/games.service";
import { createGameHandlers } from "./modules/games/games.controller";
import { gameEvents } from "./modules/realtime/game-events";
import { createProfileService } from "./modules/profiles/profiles.service";
import { createAvatarService } from "./modules/profiles/avatar.service";
import { createFriendService } from "./modules/friends/friends.service";
import { createPresenceService } from "./modules/presence/presence.service";
import { createTournamentService } from "./modules/tournaments/tournaments.service";
import { createStatisticsService } from "./modules/statistics/statistics.service";

// Connects the database, validated settings and services. Game changes share one event bus.
async function buildServices() {
  const db = await getDb(),
    config = loadConfig(process.env);
  return {
    db,
    config,
    auth: createAuthService(db, {
      verification: createVerificationService(db, { send: createVerificationSender(config.mail) }),
    }),
    games: createGameService(db, { publish: gameEvents.publish }),
    users: createUserService(db, { publish: gameEvents.publish }),
    profiles: createProfileService(db),
    avatars: createAvatarService(db),
    friends: createFriendService(db),
    presence: createPresenceService(db),
    tournaments: createTournamentService(db),
    statistics: createStatisticsService(db),
  };
}
let services: ReturnType<typeof buildServices> | undefined;

// Build once and reuse across requests. Failed startup is not kept as a permanent result.
export function getServices() {
  services ??= buildServices().catch((error) => {
    services = undefined;
    throw error;
  });
  return services;
}

// For routes that need several services: load them, run the action and format any error.
export function withServices(
  operation: (current: Awaited<ReturnType<typeof getServices>>) => Promise<Response>,
) {
  return handleApi(async () => operation(await getServices()));
}

// Connects the thin Next.js auth/account route files to the auth controller.
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

// Connects the game routes to their controller, passing a game ID only where it is needed.
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
