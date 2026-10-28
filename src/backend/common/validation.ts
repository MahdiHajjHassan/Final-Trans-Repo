import { z } from "zod";
import { DomainError } from "./errors";

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string[]> = Object.create(null);
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join(".") || "_";
    (fields[field] ??= []).push(issue.code);
  }
  throw new DomainError("VALIDATION", fields);
}
