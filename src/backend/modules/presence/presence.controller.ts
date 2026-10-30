import { z } from "zod";
import { handleApi } from "../../common/http";
import { requireSameOrigin, readJson } from "../../common/security/origin";
import { parseInput } from "../../common/validation";
import { readSessionToken } from "../auth/session.guard";
import type { createPresenceService } from "./presence.service";

export function createPresenceHandlers(
  presence: ReturnType<typeof createPresenceService>,
  config: { appOrigin: string },
) {
  return {
    heartbeat: (request: Request) =>
      handleApi(async () => {
        requireSameOrigin(request, config.appOrigin);
        parseInput(z.object({}).strict(), await readJson(request));
        await presence.heartbeat(readSessionToken(request));
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "private, no-store" },
        });
      }),
  };
}
