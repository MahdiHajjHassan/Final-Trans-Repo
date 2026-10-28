import { z } from "zod";
import { withServices } from "@/backend/services";
import { requestActor } from "@/backend/modules/auth/session.guard";
import { jsonData } from "@/backend/common/http";
import { readJson, requireSameOrigin } from "@/backend/common/security/origin";
import { parseInput } from "@/backend/common/validation";
type Context = { params: Promise<{ id: string }> };

// PUT /api/admin/users/:id: an administrator edits the account's name or role.
export function PUT(request: Request, context: Context) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    const body = await readJson(request);
    return jsonData(
      await users.updateUser(await requestActor(request, auth), (await context.params).id, body),
    );
  });
}

// DELETE /api/admin/users/:id: delete the account and safely resolve its unfinished games.
export function DELETE(request: Request, context: Context) {
  return withServices(async ({ users, auth, config }) => {
    requireSameOrigin(request, config.appOrigin);
    parseInput(z.object({}).strict(), await readJson(request));
    await users.deleteUser(await requestActor(request, auth), (await context.params).id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  });
}
