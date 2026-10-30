import { withServices } from "@/backend/services";
import { createStatisticsHandlers } from "@/backend/modules/statistics/statistics.controller";
// GET /api/leaderboard: signed-in standings from eligible human game results.
export function GET(r: Request) {
  return withServices((s) => createStatisticsHandlers(s.statistics, s.auth).leaderboard(r));
}
