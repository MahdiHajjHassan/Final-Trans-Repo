import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { AccountForms } from "@/frontend/features/account/components/AccountForms";
import { AvatarForm } from "@/frontend/features/profiles/components/AvatarForm";
import Link from "next/link";
export const metadata = { robots: { index: false, follow: false } };

/** /:locale/account: load the signed-in account on the server, then render its edit forms. */
export default async function Account({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageLocale(params);
  const actor = await requirePageActor(locale);
  const account = await (await getServices()).auth.account(actor);
  const profile = await (await getServices()).profiles.read(actor, actor.id);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.account}</h1>
          <p>{t.accountDescription}</p>
        </div>
      </div>
      <AccountForms locale={locale} account={account} />
      <AvatarForm profile={profile} locale={locale} />
      <Link href={`/${locale}/profiles/${actor.id}`}>{t.viewProfile}</Link>
    </>
  );
}
