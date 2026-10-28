"use client";
import type { ZodType } from "zod";
import { RequestError } from "./api";

/** Reads the original control value before FormData can replace malformed Unicode. */
export function formText(form: HTMLFormElement, name: string): string {
  return (
    form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ).value;
}

/**
 * Checks the form before sending it, keeping each error beside its field. The server checks
 * again.
 */
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
