"use client";
import Image from "next/image";
import Link from "@/frontend/components/AppLink";
import { useRouter } from "next/navigation";
import type { ProfilePage } from "@/shared/profiles";
import type { Locale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { Button } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { request, useMutation } from "@/frontend/lib/api";

export function ProfileSummary({ profile, locale }: { profile: ProfilePage; locale: Locale }) {
  const t = dictionaries[locale],
    mutation = useMutation(),
    router = useRouter();
  return (
    <section className="section">
      <div className="member-heading">
        <Image
          unoptimized
          src={profile.avatarUrl}
          alt=""
          width={96}
          height={96}
          className="member-avatar"
        />
        <div>
          <h1>
            <bdi>{profile.displayName}</bdi>
          </h1>
          <p>{t.profileDescription}</p>
          <p>
            {t.joinedAt}:{" "}
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
              new Date(profile.joinedAt),
            )}
          </p>
          {profile.online !== null && <p>{profile.online ? t.online : t.offline}</p>}
        </div>
      </div>
      {profile.relationship === "NONE" && (
        <Button
          disabled={mutation.pending}
          onClick={() =>
            void mutation.run(async () => {
              await request("/api/friends", "POST", { userId: profile.id });
              router.refresh();
            })
          }
        >
          {t.addFriend}
        </Button>
      )}
      {profile.relationship === "OUTGOING" && <p role="status">{t.requestSent}</p>}
      {profile.relationship === "INCOMING" && (
        <Link href={`/${locale}/friends?kind=incoming`}>{t.manageRequests}</Link>
      )}
      {profile.relationship === "FRIEND" && (
        <Link href={`/${locale}/friends`}>{t.acceptedFriends}</Link>
      )}
      {profile.relationship === "SELF" && (
        <div className="actions">
          <Link href={`/${locale}/account`}>{t.edit}</Link>
          <Link href={`/${locale}/history`}>{t.history}</Link>
        </div>
      )}
      <Feedback error={mutation.error} t={t} locale={locale} />
    </section>
  );
}
