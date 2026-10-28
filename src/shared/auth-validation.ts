import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const displayNameSchema = z.string().trim().min(1).max(60).refine((text) => text.isWellFormed(), "invalid_unicode");
export const passwordSchema = z.string().min(12).max(128).refine((text) => text.isWellFormed(), "invalid_unicode");
export const loginPasswordSchema = z.string().min(1).max(128).refine((text) => text.isWellFormed(), "invalid_unicode");
