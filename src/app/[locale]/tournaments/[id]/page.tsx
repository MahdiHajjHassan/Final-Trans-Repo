import { notFound, redirect } from "next/navigation";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { DomainError } from "@/backend/common/errors";
import { TournamentBracket } from "@/frontend/features/tournaments/components/TournamentBracket";
export const metadata = { robots: { index: false, follow: false } };
export default async function Tournament({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await pageLocale(params),
    actor = await requirePageActor(locale),
    { id } = await params;
  let initial;
  try {
    initial = await (await getServices()).tournaments.read(actor, id);
  } catch (error) {
    if (error instanceof DomainError) {
      if (error.code === "UNAUTHENTICATED") redirect(`/${locale}/login`);
      if (["NOT_FOUND", "FORBIDDEN", "VALIDATION"].includes(error.code)) notFound();
    }
    throw error;
  }
  return (
    <TournamentBracket
      key={`${id}:${locale}`}
      initial={initial}
      actorId={actor.id}
      locale={locale}
    />
  );
}
