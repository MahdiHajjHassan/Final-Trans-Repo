"use client";
import Link from "@/frontend/components/AppLink";
import { useParams } from "next/navigation";
import { isLocale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";

/** A missing page, using the language in the URL when it is supported. */
export default function NotFound() {
  const params = useParams();
  const locale = isLocale(params.locale) ? params.locale : "en";
  const t = dictionaries[locale];
  return (
    <div className="stack">
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundHelp}</p>
      <Link href={`/${locale}/play`}>{t.board}</Link>
    </div>
  );
}
