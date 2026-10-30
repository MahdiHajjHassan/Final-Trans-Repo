import { withServices } from "@/backend/services";
import { createStatisticsHandlers } from "@/backend/modules/statistics/statistics.controller";
// GET /api/account/statistics: this member's derived competitive totals and progression.
export function GET(r: Request) {
  return withServices((s) => createStatisticsHandlers(s.statistics, s.auth).summary(r));
}
