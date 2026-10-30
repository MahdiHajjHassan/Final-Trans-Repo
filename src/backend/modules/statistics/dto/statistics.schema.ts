import { z } from "zod";
const page = z.coerce.number().int().min(1).max(100000).default(1);
export const historyQuery = z
  .object({ page, mode: z.enum(["ALL", "HUMAN", "AI"]).default("ALL") })
  .strict();
export const leaderboardQuery = z.object({ page }).strict();
