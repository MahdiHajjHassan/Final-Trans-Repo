import { z } from "zod";
import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import { handleApi, jsonData } from "../../common/http";
import { requireSameOrigin, readJson } from "../../common/security/origin";
import { strictQuery } from "../../common/security/query";
import { parseInput } from "../../common/validation";
import { profileId } from "../profiles/profiles.service";
import type { FriendService } from "./friends.service";

export function createFriendHandlers(
  friends: FriendService,
  auth: AuthService,
  config: { appOrigin: string },
) {
  async function body(request: Request) {
    requireSameOrigin(request, config.appOrigin);
    return readJson(request);
  }
  return {
    list: (r: Request) =>
      handleApi(async () =>
        jsonData(await friends.list(await requestActor(r, auth), strictQuery(r))),
      ),
    request: (r: Request) =>
      handleApi(async () => {
        const input = parseInput(z.object({ userId: profileId }).strict(), await body(r));
        return jsonData(await friends.request(await requestActor(r, auth), input.userId));
      }),
    accept: (r: Request, id: string) =>
      handleApi(async () => {
        parseInput(z.object({ action: z.literal("accept") }).strict(), await body(r));
        return jsonData(await friends.accept(await requestActor(r, auth), id));
      }),
    remove: (r: Request, id: string) =>
      handleApi(async () => {
        parseInput(z.object({}).strict(), await body(r));
        await friends.remove(await requestActor(r, auth), id);
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "private, no-store" },
        });
      }),
  };
}
