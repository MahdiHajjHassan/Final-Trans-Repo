import type { MetadataRoute } from "next";
import { locales } from "@/shared/i18n/config";
import { loadConfig } from "@/backend/config/env";
export const dynamic = "force-dynamic";

/** List the public play/legal pages in all languages, with their language alternatives. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = loadConfig(process.env).appOrigin;
  return locales.flatMap((locale) =>
    ["play", "privacy", "terms"].map((path) => ({
      url: `${origin}/${locale}/${path}`,
      alternates: {
        languages: Object.fromEntries(
          locales.map((language) => [language, `${origin}/${language}/${path}`]),
        ),
      },
    })),
  );
}
