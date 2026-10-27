import { cookies, headers } from "next/headers";
import { isLocale, readTheme } from "@/i18n/config";
import "./globals.css";
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const candidate = (await headers()).get("x-taskboard-locale"); const locale = isLocale(candidate) ? candidate : "en";
  const theme = readTheme((await cookies()).get("__Host-taskboard_theme")?.value);
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-theme={theme}><body>{children}</body></html>;
}
