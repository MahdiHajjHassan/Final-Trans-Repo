import { z } from "zod";
import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import { handleApi, jsonData } from "../../common/http";
import { requireSameOrigin, readJson } from "../../common/security/origin";
import { readBytes } from "../../common/security/read-bytes";
import { parseInput } from "../../common/validation";
import type { AvatarService } from "./avatar.service";
import { maxAvatarBytes } from "./avatar-image";

// Upload is the only raw image request; all other writes retain the usual JSON contract.
export function createAvatarHandlers(
  avatars: AvatarService,
  auth: AuthService,
  config: { appOrigin: string },
) {
  return {
    put: (request: Request) =>
      handleApi(async () => {
        requireSameOrigin(request, config.appOrigin);
        const actor = await requestActor(request, auth);
        const bytes = await readBytes(request, maxAvatarBytes);
        return jsonData(await avatars.put(actor, bytes, request.headers.get("content-type") ?? ""));
      }),
    remove: (request: Request) =>
      handleApi(async () => {
        requireSameOrigin(request, config.appOrigin);
        parseInput(z.object({}).strict(), await readJson(request));
        return jsonData(await avatars.remove(await requestActor(request, auth)));
      }),
    read: (request: Request, id: string) =>
      handleApi(async () => {
        const result = await avatars.read(await requestActor(request, auth), id);
        return new Response(Uint8Array.from(result.bytes), {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }),
  };
}
