import { z } from "zod";
export const tournamentCreate = z.object({}).strict();
export const tournamentJoin = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NP-Z2-9]{8}$/),
  })
  .strict();
export const tournamentRevision = z
  .object({ expectedVersion: z.number().int().positive().max(2147483647) })
  .strict();
export const tournamentList = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
