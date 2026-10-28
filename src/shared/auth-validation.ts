import { z } from "zod";

// Account emails are trimmed and lowercased before syntax and uniqueness checks.
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

// Names may contain Unicode, but not broken surrogate sequences or only whitespace.
export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((text) => text.isWellFormed(), "invalid_unicode");

// Rules for a NEW password. Do not trim it: spaces are part of the password.
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((text) => text.isWellFormed(), "invalid_unicode");

// Existing passwords can be shorter than the current new-password rule.
export const loginPasswordSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((text) => text.isWellFormed(), "invalid_unicode");
