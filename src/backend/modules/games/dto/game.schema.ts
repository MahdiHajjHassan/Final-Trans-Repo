import { z } from "zod";

// A room is either for two people or for one person against the computer.
export const createGameSchema = z.object({ mode: z.enum(["HUMAN", "AI"]) }).strict();

// Trim and uppercase the invitation before checking its eight allowed characters.
export const joinGameSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NP-Z2-9]{8}$/),
  })
  .strict();

// Moves, resignations and cancellations include the version the player saw.
export const revisionSchema = z.object({ expectedVersion: z.number().int().min(1) }).strict();

// Cells are numbered 0 to 8, left to right and then top to bottom.
export const moveSchema = revisionSchema.extend({ cell: z.number().int().min(0).max(8) }).strict();

// Use one lowercase spelling of each UUID, including when subscribing to a live game.
export const gameIdSchema = z.uuid().transform((id) => id.toLowerCase());

// Missing page means page 1; URL query strings are converted to whole numbers.
export const listGamesSchema = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
