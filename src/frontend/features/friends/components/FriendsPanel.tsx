"use client";
import Image from "next/image";
import Link from "next/link";
import type { FriendList } from "@/shared/friends";
import type { Locale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { Button, Pagination } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { request, useMutation } from "@/frontend/lib/api";
import { useVisiblePoll } from "@/frontend/lib/use-visible-poll";

// Relationship actions use row IDs; public names are never treated as account identity.
export function FriendsPanel({
  initial,
  kind,
  locale,
}: {
  initial: FriendList;
  kind: "accepted" | "incoming" | "outgoing";
  locale: Locale;
}) {
  const t = dictionaries[locale],
    mutation = useMutation(),
    poll = useVisiblePoll(`/api/friends?kind=${kind}&page=${initial.page}`, initial, 15000),
    list = poll.data;
  async function change(id: string, accept = false) {
    await request(
      `/api/friends/${id}`,
      accept ? "PATCH" : "DELETE",
      accept ? { action: "accept" } : {},
    );
    await poll.refresh();
  }
  return (
    <section className="section">
      <nav className="section-tabs" aria-label={t.friends}>
        {(["accepted", "incoming", "outgoing"] as const).map((k) => (
          <Link
            key={k}
            href={`/${locale}/friends?kind=${k}`}
            aria-current={kind === k ? "page" : undefined}
          >
            {k === "accepted"
              ? t.acceptedFriends
              : k === "incoming"
                ? t.incomingRequests
                : t.outgoingRequests}
          </Link>
        ))}
      </nav>
      <Feedback
        error={mutation.error ?? poll.error}
        success={mutation.success && t.friendChanged}
        t={t}
        locale={locale}
      />
      {!list.items.length ? (
        <p>{t.noFriends}</p>
      ) : (
        <ul className="member-list">
          {list.items.map((row) => (
            <li key={row.id}>
              <Image
                unoptimized
                src={row.profile.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="member-avatar"
              />
              <div className="member-detail">
                <Link href={`/${locale}/profiles/${row.profile.id}`}>
                  <bdi>{row.profile.displayName}</bdi>
                </Link>
                {row.online !== null && <span>{row.online ? t.online : t.offline}</span>}
              </div>
              <div className="actions">
                {kind === "incoming" && (
                  <Button
                    disabled={mutation.pending}
                    onClick={() => void mutation.run(() => change(row.id, true))}
                  >
                    {t.acceptFriend}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={mutation.pending}
                  onClick={() => void mutation.run(() => change(row.id))}
                >
                  {kind === "accepted"
                    ? t.removeFriend
                    : kind === "incoming"
                      ? t.declineFriend
                      : t.withdrawFriend}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={list.page}
        total={list.total}
        pathname={`/${locale}/friends`}
        query={`kind=${kind}`}
        t={t}
      />
      <p className="muted">{t.presenceHelp}</p>
    </section>
  );
}
