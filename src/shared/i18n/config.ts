// The languages the routes and dictionaries support. Arabic also selects the RTL layout.
export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];

// Narrow an untrusted URL or cookie value to one of our supported languages.
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

// An absent or unknown preference falls back to the light theme.
export function readTheme(value: unknown): "light" | "dark" {
  return value === "dark" ? "dark" : "light";
}

// Replace the language part of a URL while keeping its page and query filters.
export function localePath(pathname: string, search: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/") + (search ? `?${search}` : "");
}

// Show dates in the selected language, using UTC consistently on server and client.
export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}
