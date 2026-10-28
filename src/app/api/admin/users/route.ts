import { withServices } from "@/server/services";
import { requestActor } from "@/server/auth/policy";
import { jsonData } from "@/server/api/http";
import { parseUserQuery } from "@/server/users/service";
import { readJson, requireSameOrigin } from "@/server/security/origin";
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
export function POST(request: Request) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    const actor = await requestActor(request, auth);
    return jsonData(await users.createUser(actor, await readJson(request)), 201);
  });
}
