import { withServices } from "@/backend/services";
import { requestActor } from "@/backend/modules/auth/session.guard";
import { jsonData } from "@/backend/common/http";
import { parseUserQuery } from "@/backend/modules/users/users.service";
import { clientKey, readJson, requireSameOrigin } from "@/backend/common/security/origin";
import { verificationCookie } from "@/backend/modules/auth/email/verification-cookie";

// GET /api/admin/users: an administrator's filtered, paginated account list.
export function GET(request: Request) {
  return withServices(async ({ users, auth }) =>
    jsonData(
      await users.listUsers(
        await requestActor(request, auth),
        parseUserQuery(new URL(request.url).searchParams),
      ),
    ),
  );
}

// POST /api/admin/users: stage an account until this administrator confirms its emailed code.
export function POST(request: Request) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    const actor = await requestActor(request, auth);
    const pending = await users.createUser(actor, await readJson(request), clientKey(request));
    const response = jsonData({ verificationRequired: true }, 202);
    response.headers.set("Set-Cookie", verificationCookie(pending.token, pending.expiresAt));
    return response;
  });
}
