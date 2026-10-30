import { z } from "zod";
import {
  displayNameSchema,
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "@/shared/auth-validation";
export { passwordSchema } from "@/shared/auth-validation";

// The fields registration accepts. Unknown fields, such as a supplied role, are rejected.
export const registerSchema = z
  .object({
    email: emailSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
    locale: z.enum(["en", "fr", "ar"]).default("en"),
  })
  .strict();

// Only the protected administrator creation path may request an account role.
export const adminCreateSchema = registerSchema.extend({
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

// Login checks the supplied password without applying the new-password length rule.
export const loginSchema = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
    locale: z.enum(["en", "fr", "ar"]).default("en"),
  })
  .strict();

// The profile form may change the display name only.
export const accountSchema = z.object({ displayName: displayNameSchema }).strict();

// Both passwords are required: the current one proves this is the account owner.
export const passwordChangeSchema = z
  .object({ currentPassword: loginPasswordSchema, newPassword: passwordSchema })
  .strict();
