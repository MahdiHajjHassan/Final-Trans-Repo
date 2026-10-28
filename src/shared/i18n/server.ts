import { notFound } from "next/navigation";
import { isLocale } from "./config";
import { dictionaries } from "./dictionaries";

// Read and validate the page language before choosing its dictionary. Unknown languages
// return 404.
export async function pageLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, t: dictionaries[locale] };
}
