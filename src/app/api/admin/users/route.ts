import { withServices } from "@/backend/services";
import { requestActor } from "@/backend/modules/auth/session.guard";
import { jsonData } from "@/backend/common/http";
import { parseUserQuery } from "@/backend/modules/users/users.service";
import { readJson, requireSameOrigin } from "@/backend/common/security/origin";

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

// POST /api/admin/users: an administrator creates an account with a chosen role.
export function POST(request: Request) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    const actor = await requestActor(request, auth);
    return jsonData(await users.createUser(actor, await readJson(request)), 201);
  });
}
