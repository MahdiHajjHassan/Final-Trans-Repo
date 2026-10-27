export const locales = ["en", "fr", "ar"] as const;
export type Locale = typeof locales[number];
export function isLocale(value: unknown): value is Locale { return typeof value === "string" && locales.includes(value as Locale); }
export function readTheme(value: unknown): "light" | "dark" { return value === "dark" ? "dark" : "light"; }
export function localePath(pathname: string, search: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/") + (search ? `?${search}` : "");
}
export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
