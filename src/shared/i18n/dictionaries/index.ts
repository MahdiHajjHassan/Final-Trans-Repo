import type { Locale } from "@/shared/i18n/config";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { ar } from "./locales/ar";

// English defines the text keys. Every translation must supply the same keys.
export type Dictionary = { [K in keyof typeof en]: string };

// The dictionary selected by each page and client component.
export const dictionaries: Record<Locale, Dictionary> = { en, fr, ar };
