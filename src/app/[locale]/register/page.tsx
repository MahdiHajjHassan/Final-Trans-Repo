import { pageLocale } from "@/shared/i18n/server";
import { AuthForm } from "@/frontend/features/auth";
export const metadata = { robots: { index: false, follow: false } };

/** /:locale/register: the account-creation form in the chosen language. */
export default async function Register({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageLocale(params);
  return (
    <>
      <div className="page-heading">
        <h1>{t.register}</h1>
      </div>
      <AuthForm locale={locale} mode="register" />
    </>
  );
}
