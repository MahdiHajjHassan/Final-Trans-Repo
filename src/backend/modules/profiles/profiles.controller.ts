import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import type { FriendService } from "../friends/friends.service";
import { handleApi, jsonData } from "../../common/http";
import { strictQuery } from "../../common/security/query";
import type { createProfileService } from "./profiles.service";

// Compose public profile data with only the caller's relationship to that member.
export function createProfileHandlers(
  profiles: ReturnType<typeof createProfileService>,
  friends: FriendService,
  auth: AuthService,
) {
  return {
    search: (r: Request) =>
      handleApi(async () =>
        jsonData(await profiles.search(await requestActor(r, auth), strictQuery(r))),
      ),
    read: (r: Request, id: string) =>
      handleApi(async () => {
        const actor = await requestActor(r, auth);
        return jsonData({
          ...(await profiles.read(actor, id)),
          ...(await friends.relationship(actor, id)),
        });
      }),
  };
}
