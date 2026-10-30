import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, readTheme } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { getPageActor } from "@/backend/modules/auth/auth.pages";
import { Preferences } from "@/frontend/layout/preferences";
import { Navigation } from "@/frontend/layout/Navigation";
export const dynamic = "force-dynamic";

/** The translated site title and description for this language section. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return {
    title: { default: t.brand, template: "%s · " + t.brand },
    description: t.metadataDescription,
  };
}

/** The shared header/footer. Session and theme are read on the server for this request. */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  const actor = await getPageActor(),
    theme = readTheme((await cookies()).get("__Host-taskboard_theme")?.value);
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href={"/" + locale + "/play"}>
            <svg className="brand-symbol" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path
                d="m10 11 10 18m0-18L10 29"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="29" cy="20" r="5" stroke="currentColor" strokeWidth="3.5" />
            </svg>
            {t.brand}
          </Link>
          <Navigation locale={locale} role={actor?.role} />
          <Suspense>
            <Preferences locale={locale} theme={theme} />
          </Suspense>
        </div>
      </header>
      <main className="shell main" id="main">
        {children}
      </main>
      <footer className="shell footer">
        <span className="footer-brand">
          {t.brand}
          <span aria-hidden="true"> / X O</span>
        </span>
        {(["privacy", "terms"] as const).map((kind) => (
          <Link
            key={kind}
            href={"/" + locale + "/" + kind}
            target="_blank"
            rel="noopener noreferrer"
            title={t.opensNewTab}
          >
            {t[kind]}
            <span className="sr-only"> ({t.opensNewTab})</span>
          </Link>
        ))}
      </footer>
    </>
  );
}
