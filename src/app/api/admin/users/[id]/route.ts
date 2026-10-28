import { z } from "zod";
import { withServices } from "@/server/services";
import { requestActor } from "@/server/auth/policy";
import { jsonData } from "@/server/api/http";
import { readJson, requireSameOrigin } from "@/server/security/origin";
import { parseInput } from "@/server/validation";
type Context = { params: Promise<{ id: string }> };
export function PUT(request: Request, context: Context) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    const body = await readJson(request);
    return jsonData(
      await users.updateUser(await requestActor(request, auth), (await context.params).id, body),
    );
  });
}
export function DELETE(request: Request, context: Context) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    parseInput(z.object({}).strict(), await readJson(request));
    await users.deleteUser(await requestActor(request, auth), (await context.params).id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  });
}
