import type { AuthService } from "./auth.service";
import type { ServerConfig } from "../../config/env";
import { clientKey, readJson, requireSameOrigin } from "../../common/security/origin";
import { handleApi, jsonData } from "../../common/http";
import {
  sessionCookieName as cookieName,
  readSessionToken as readToken,
  requestActor,
} from "./session.guard";

function setSession(response: Response, token: string, expiresAt: Date): Response {
  response.headers.set(
    "Set-Cookie",
    `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Expires=${expiresAt.toUTCString()}`,
  );
  return response;
}
function clearedSession(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store",
      "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    },
  });
}

// Handle cookies and HTTP here; account rules stay in the service.
export function createAuthHandlers(auth: AuthService, config: Pick<ServerConfig, "appOrigin">) {
  const actor = (request: Request) => requestActor(request, auth);
  async function body(request: Request) {
    requireSameOrigin(request, config.appOrigin);
    return readJson(request);
  }
  return {
    register(request: Request) {
      return handleApi(async () =>
        jsonData(await auth.register(await body(request), clientKey(request)), 201),
      );
    },
    login(request: Request) {
      return handleApi(async () => {
        const result = await auth.login(await body(request), clientKey(request));
        return setSession(jsonData(result.user), result.token, result.expiresAt);
      });
    },
    logout(request: Request) {
      return handleApi(async () => {
        await body(request);
        await auth.logout(readToken(request));
        return clearedSession();
      });
    },
    account(request: Request) {
      return handleApi(async () => jsonData(await auth.account(await actor(request))));
    },
    updateAccount(request: Request) {
      return handleApi(async () => {
        const input = await body(request);
        return jsonData(await auth.updateAccount(await actor(request), input));
      });
    },
    changePassword(request: Request) {
      return handleApi(async () => {
        const input = await body(request);
        await auth.changePassword(await actor(request), input);
        return clearedSession();
      });
    },
  };
}
