import { z } from "zod";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import {
  readVerificationToken,
  verificationCookie,
  clearedVerificationCookie,
} from "./email/verification-cookie";
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
    // POST /api/auth/register: start verification, without creating an account or session.
    register(request: Request) {
      return handleApi(async () => {
        const pending = await auth.register(await body(request), clientKey(request));
        const response = jsonData({ verificationRequired: true }, 202);
        response.headers.set("Set-Cookie", verificationCookie(pending.token, pending.expiresAt));
        return response;
      });
    },

    // POST /api/auth/login: return the account and set its session cookie.
    login(request: Request) {
      return handleApi(async () => {
        const input = await body(request);
        try {
          const result = await auth.login(input, clientKey(request));
          return setSession(jsonData(result.user), result.token, result.expiresAt);
        } catch (error) {
          if (!(error instanceof DomainError) || error.code !== "EMAIL_UNVERIFIED") throw error;
          const pending = await auth.verification.startExisting(input, clientKey(request));
          const response = jsonData({ verificationRequired: true }, 202);
          response.headers.set("Set-Cookie", verificationCookie(pending.token, pending.expiresAt));
          return response;
        }
      });
    },

    // GET /api/auth/verification: safe metadata for this browser's pending attempt.
    verificationRead(request: Request) {
      return handleApi(async () =>
        jsonData(await auth.verification.read(readVerificationToken(request))),
      );
    },
    // POST /api/auth/verification/confirm: consume the code without creating a login session.
    verificationConfirm(request: Request) {
      return handleApi(async () => {
        const input = parseInput(z.object({ code: z.string() }).strict(), await body(request));
        const result = await auth.verification.confirm(
          readVerificationToken(request),
          input.code,
          clientKey(request),
          await auth.resolveSession(readToken(request)),
        );
        const response = jsonData(result);
        response.headers.set("Set-Cookie", clearedVerificationCookie);
        return response;
      });
    },
    // POST /api/auth/verification/resend: rotate the code under persistent address/client quotas.
    verificationResend(request: Request) {
      return handleApi(async () => {
        parseInput(z.object({}).strict(), await body(request));
        const raw = readVerificationToken(request);
        await auth.verification.resend(
          raw,
          clientKey(request),
          await auth.resolveSession(readToken(request)),
        );
        return jsonData(await auth.verification.read(raw));
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
