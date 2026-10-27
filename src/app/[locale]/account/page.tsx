import { pageLocale } from "@/i18n/server";
import { requirePageActor } from "@/server/auth/page";
import { getServices } from "@/server/services";
import { AccountForms } from "@/features/auth";
export const metadata = { robots: { index: false, follow: false } };
export default async function Account({ params }: { params: Promise<{ locale: string }> }) { const { locale, t } = await pageLocale(params); const actor = await requirePageActor(locale); const account = await (await getServices()).auth.account(actor); return <><div className="page-heading"><div><h1>{t.account}</h1><p>{t.accountDescription}</p></div></div><AccountForms locale={locale} account={account} /></>; }
