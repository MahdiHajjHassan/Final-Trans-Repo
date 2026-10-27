import { z } from "zod";
const email = z.string().trim().toLowerCase().pipe(z.email());
export const passwordSchema = z.string().min(12).max(128);
export const registerSchema = z.object({ email, displayName: z.string().trim().min(1).max(60), password: passwordSchema }).strict();
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const accountSchema = z.object({ displayName: z.string().trim().min(1).max(60) }).strict();
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }).strict();
