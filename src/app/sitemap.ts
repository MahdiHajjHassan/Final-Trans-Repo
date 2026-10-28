import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { loadConfig } from "@/server/config";
export const dynamic = "force-dynamic";
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
