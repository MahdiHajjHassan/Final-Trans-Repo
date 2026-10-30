import { z } from "zod";
import type { AuthService } from "../auth/auth.service";
import { requestActor } from "../auth/session.guard";
import { handleApi, jsonData } from "../../common/http";
import { strictQuery } from "../../common/security/query";
import { parseInput } from "../../common/validation";
import type { StatisticsService } from "./statistics.service";

export function createStatisticsHandlers(statistics: StatisticsService, auth: AuthService) {
  return {
    summary: (r: Request) =>
      handleApi(async () => {
        parseInput(z.object({}).strict(), strictQuery(r));
        return jsonData(await statistics.summary(await requestActor(r, auth)));
      }),
    history: (r: Request) =>
      handleApi(async () =>
        jsonData(await statistics.history(await requestActor(r, auth), strictQuery(r))),
      ),
    leaderboard: (r: Request) =>
      handleApi(async () =>
        jsonData(await statistics.leaderboard(await requestActor(r, auth), strictQuery(r))),
      ),
  };
}
