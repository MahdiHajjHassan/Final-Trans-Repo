import { pageLocale } from "@/i18n/server";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { const { t } = await pageLocale(params); return { title: t.terms }; }
export default async function Legal({ params }: { params: Promise<{ locale: string }> }) { const { t } = await pageLocale(params); return <article className="legal"><h1>{t.terms}</h1><p><small>{t.legalUpdated}</small></p><p>{t.termsBody}</p></article>; }
