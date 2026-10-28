"use client";
import type { ZodType } from "zod";
import { RequestError } from "./api";

// FormData converts malformed UTF-16 to replacement characters. Validate the
// original control value first so invalid account text is never silently changed.
export function formText(form: HTMLFormElement, name: string): string {
  return (
    form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ).value;
}

export function validateFields(
  input: Record<string, unknown>,
  schemas: Record<string, ZodType>,
): void {
  const fields: Record<string, string[]> = {};
  for (const [name, schema] of Object.entries(schemas)) {
    if (!schema.safeParse(input[name]).success) fields[name] = ["invalid"];
  }
  if (Object.keys(fields).length) throw new RequestError("VALIDATION", fields);
}
