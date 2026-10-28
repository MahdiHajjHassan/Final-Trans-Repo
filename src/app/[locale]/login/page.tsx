import { pageLocale } from "@/shared/i18n/server";
import { AuthForm } from "@/frontend/features/auth";
export const metadata = { robots: { index: false, follow: false } };

/** /:locale/login: show the shared form and any allowed registration/password-change notice. */
export default async function Login({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale, t } = await pageLocale(params);
  const { notice } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.login}</h1>
          <p>{t.loginRequired}</p>
        </div>
      </div>
      <AuthForm
        locale={locale}
        mode="login"
        notice={notice === "registered" || notice === "passwordChanged" ? notice : undefined}
      />
    </>
  );
}
