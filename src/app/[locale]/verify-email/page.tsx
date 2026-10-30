import { cookies } from "next/headers";
import { pageLocale } from "@/shared/i18n/server";
import { AuthLayout } from "@/frontend/layout/AuthLayout";
import { VerifyEmail } from "@/frontend/features/auth/components/VerifyEmail";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import { verificationCookieName } from "@/backend/modules/auth/email/verification-cookie";
import type { VerificationMetadata } from "@/shared/auth";

export const metadata = { robots: { index: false, follow: false } };

/** /:locale/verify-email: render only the requesting browser's safe pending metadata. */
export default async function Verification({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageLocale(params);
  const tokens = (await cookies()).getAll(verificationCookieName);
  let initial: VerificationMetadata | null = null;
  if (tokens.length === 1) {
    try {
      initial = await (await getServices()).auth.verification.read(tokens[0].value);
    } catch (error) {
      if (!(error instanceof DomainError) || error.code !== "INVALID_CODE") throw error;
    }
  }
  return (
    <AuthLayout t={t}>
      <div className="page-heading">
        <div>
          <h1>{t.verificationTitle}</h1>
          <p>{t.verificationHelp}</p>
        </div>
      </div>
      <VerifyEmail locale={locale} initial={initial} />
    </AuthLayout>
  );
}
