import { z } from "zod";
import {
  displayNameSchema,
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "@/shared/auth-validation";
export { passwordSchema } from "@/shared/auth-validation";
export const registerSchema = z
  .object({ email: emailSchema, displayName: displayNameSchema, password: passwordSchema })
  .strict();
export const loginSchema = z.object({ email: emailSchema, password: loginPasswordSchema }).strict();
export const accountSchema = z.object({ displayName: displayNameSchema }).strict();
export const passwordChangeSchema = z
  .object({ currentPassword: loginPasswordSchema, newPassword: passwordSchema })
  .strict();
