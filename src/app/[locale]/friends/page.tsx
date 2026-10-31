import Link from "@/frontend/components/AppLink";
import { pageLocale } from "@/shared/i18n/server";
import { requirePageActor } from "@/backend/modules/auth/auth.pages";
import { getServices } from "@/backend/services";
import { FriendsPanel } from "@/frontend/features/friends/components/FriendsPanel";
import { Button, TextField, Pagination } from "@/frontend/components/ui";
export const metadata = { robots: { index: false, follow: false } };

export default async function Friends({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await pageLocale(params),
    actor = await requirePageActor(locale),
    s = await getServices(),
    query = await searchParams;
  const kind = query.kind === "incoming" || query.kind === "outgoing" ? query.kind : "accepted",
    page =
      typeof query.page === "string" && /^\d{1,5}$/.test(query.page)
        ? Math.max(1, Number(query.page))
        : 1;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const list = await s.friends.list(actor, { kind, page: q ? 1 : page });
  const found =
    q.length >= 2 && q.length <= 60 ? await s.profiles.search(actor, { q, page }) : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t.friends}</h1>
          <p>{t.friendsDescription}</p>
        </div>
      </div>
      <section>
        <form method="get" className="search-form">
          <TextField
            name="q"
            label={t.findPlayer}
            defaultValue={q}
            minLength={2}
            maxLength={60}
            required
          />
          <Button>{t.searchPlayers}</Button>
        </form>
        {found && (
          <div className="section">
            <h2>{t.searchResults}</h2>
            {found.items.length ? (
              <ul className="member-list">
                {found.items.map((profile) => (
                  <li key={profile.id}>
                    <Link href={`/${locale}/profiles/${profile.id}`}>
                      <bdi>{profile.displayName}</bdi>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t.noPlayers}</p>
            )}
            <Pagination
              page={found.page}
              total={found.total}
              pathname={`/${locale}/friends`}
              query={`q=${encodeURIComponent(q)}`}
              t={t}
            />
          </div>
        )}
      </section>
      <FriendsPanel key={`${kind}:${list.page}`} locale={locale} initial={list} kind={kind} />
    </>
  );
}
