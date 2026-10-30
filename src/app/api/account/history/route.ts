import { withServices } from "@/backend/services";
import { createStatisticsHandlers } from "@/backend/modules/statistics/statistics.controller";
// GET /api/account/history: only the caller's completed games.
export function GET(r: Request) {
  return withServices((s) => createStatisticsHandlers(s.statistics, s.auth).history(r));
}
