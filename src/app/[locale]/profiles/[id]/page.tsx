import { notFound } from "next/navigation";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import type { ProfilePage } from "@/shared/profiles";
import { ProfileSummary } from "@/frontend/features/profiles/components/ProfileSummary";
export const metadata = { robots: { index: false, follow: false } };

export default async function Profile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await pageLocale(params),
    actor = await requirePageActor(locale),
    { id } = await params,
    s = await getServices();
  let profile: ProfilePage;
  try {
    profile = {
      ...(await s.profiles.read(actor, id)),
      ...(await s.friends.relationship(actor, id)),
    };
  } catch (error) {
    if (error instanceof DomainError && ["NOT_FOUND", "VALIDATION"].includes(error.code))
      notFound();
    throw error;
  }
  return <ProfileSummary profile={profile} locale={locale} />;
}
