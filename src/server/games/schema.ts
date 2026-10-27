import { z } from "zod";
export const createGameSchema=z.object({mode:z.enum(["HUMAN","AI"])}).strict();
export const joinGameSchema=z.object({code:z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{8}$/)}).strict();
export const revisionSchema=z.object({expectedVersion:z.number().int().min(1)}).strict();
export const moveSchema=revisionSchema.extend({cell:z.number().int().min(0).max(8)}).strict();
export const gameIdSchema=z.uuid();
export const listGamesSchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
