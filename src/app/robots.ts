import type { MetadataRoute } from "next";
import { locales } from "@/shared/i18n/config";
import { loadConfig } from "@/backend/config/env";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...locales.flatMap((locale) =>
          ["account", "admin", "games", "login", "register"].map((path) => `/${locale}/${path}`),
        ),
      ],
    },
    sitemap: `${loadConfig(process.env).appOrigin}/sitemap.xml`,
  };
}
