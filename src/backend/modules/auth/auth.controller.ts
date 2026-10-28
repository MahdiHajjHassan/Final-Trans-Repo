import type { AuthService } from "./auth.service";
import type { ServerConfig } from "../../config/env";
import { clientKey, readJson, requireSameOrigin } from "../../common/security/origin";
import { handleApi, jsonData } from "../../common/http";
import {
  sessionCookieName as cookieName,
  readSessionToken as readToken,
  requestActor,
} from "./session.guard";

// Puts the new token in a cookie that JavaScript cannot read, valid for seven days.
function setSession(response: Response, token: string, expiresAt: Date): Response {
  response.headers.set(
    "Set-Cookie",
    `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Expires=${expiresAt.toUTCString()}`,
  );
  return response;
}

// Expires the browser cookie and returns an empty response.
function clearedSession(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store",
      "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    },
  });
}

// The HTTP side of accounts: read the request, call the service, set or clear the cookie.
export function createAuthHandlers(auth: AuthService, config: Pick<ServerConfig, "appOrigin">) {
  const actor = (request: Request) => requestActor(request, auth);

  // Writes must come from our own site and carry a JSON body.
  async function body(request: Request) {
    requireSameOrigin(request, config.appOrigin);
    return readJson(request);
  }
  return {
    // POST /api/auth/register: create the account, without starting a session.
    register(request: Request) {
      return handleApi(async () =>
        jsonData(await auth.register(await body(request), clientKey(request)), 201),
      );
    },

    // POST /api/auth/login: return the account and set its session cookie.
    login(request: Request) {
      return handleApi(async () => {
        const result = await auth.login(await body(request), clientKey(request));
        return setSession(jsonData(result.user), result.token, result.expiresAt);
      });
    },

    // POST /api/auth/logout: revoke the session and remove its cookie.
    logout(request: Request) {
      return handleApi(async () => {
        await body(request);
        await auth.logout(readToken(request));
        return clearedSession();
      });
    },

    // GET /api/account: the account behind the current session.
    account(request: Request) {
      return handleApi(async () => jsonData(await auth.account(await actor(request))));
    },

    // PATCH /api/account: update the signed-in user's display name.
    updateAccount(request: Request) {
      return handleApi(async () => {
        const input = await body(request);
        return jsonData(await auth.updateAccount(await actor(request), input));
      });
    },

    // PUT /api/account/password: change the password, then clear this browser's cookie too.
    changePassword(request: Request) {
      return handleApi(async () => {
        const input = await body(request);
        await auth.changePassword(await actor(request), input);
        return clearedSession();
      });
    },
  };
}
