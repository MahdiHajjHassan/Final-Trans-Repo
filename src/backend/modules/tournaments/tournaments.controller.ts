import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import { handleApi, jsonData } from "../../common/http";
import { requireSameOrigin, readJson } from "../../common/security/origin";
import { strictQuery } from "../../common/security/query";
import type { TournamentService } from "./tournaments.service";

// The bracket controller never accepts a score or winner from a browser.
export function createTournamentHandlers(
  tournaments: TournamentService,
  auth: AuthService,
  config: { appOrigin: string },
) {
  async function body(r: Request) {
    requireSameOrigin(r, config.appOrigin);
    return readJson(r);
  }
  return {
    create: (r: Request) =>
      handleApi(async () => {
        const input = await body(r);
        return jsonData(await tournaments.create(await requestActor(r, auth), input), 201);
      }),
    join: (r: Request) =>
      handleApi(async () => {
        const input = await body(r);
        return jsonData(await tournaments.join(await requestActor(r, auth), input));
      }),
    list: (r: Request) =>
      handleApi(async () =>
        jsonData(await tournaments.listMine(await requestActor(r, auth), strictQuery(r))),
      ),
    read: (r: Request, id: string) =>
      handleApi(async () => jsonData(await tournaments.read(await requestActor(r, auth), id))),
    start: (r: Request, id: string) =>
      handleApi(async () => {
        const input = await body(r);
        return jsonData(await tournaments.start(await requestActor(r, auth), id, input));
      }),
    cancel: (r: Request, id: string) =>
      handleApi(async () => {
        const input = await body(r);
        return jsonData(await tournaments.cancel(await requestActor(r, auth), id, input));
      }),
    leave: (r: Request, id: string) =>
      handleApi(async () => {
        const input = await body(r);
        await tournaments.leave(await requestActor(r, auth), id, input);
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "private, no-store" },
        });
      }),
  };
}
