import type { Locale } from "@/shared/i18n/config";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";
export type Dictionary = { [K in keyof typeof en]: string };
export const dictionaries: Record<Locale, Dictionary> = { en, fr, ar };
