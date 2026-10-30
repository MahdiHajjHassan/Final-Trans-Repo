import Image from "next/image";
import Link from "next/link";
import type { LeaderboardPage } from "@/shared/statistics";
import type { Locale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { DataTable, Pagination } from "@/frontend/components/ui";

// Standings reuse the safe public identity projection and canonical server ranking.
export function Leaderboard({ standings, locale }: { standings: LeaderboardPage; locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <section className="section">
      {!standings.items.length ? (
        <p>{t.noRankings}</p>
      ) : (
        <DataTable
          caption={t.standings}
          headings={[t.rank, t.displayName, t.points, t.played, t.wins, t.losses, t.draws, t.level]}
        >
          {standings.items.map((row) => (
            <tr key={row.profile.id}>
              <td>
                <bdi>{row.rank}</bdi>
              </td>
              <td>
                <div className="leaderboard-player">
                  <Image
                    unoptimized
                    src={row.profile.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="member-avatar"
                  />
                  <Link href={`/${locale}/profiles/${row.profile.id}`}>
                    <bdi>{row.profile.displayName}</bdi>
                  </Link>
                </div>
              </td>
              <td>
                <bdi>{row.points}</bdi>
              </td>
              <td>{row.played}</td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td>{row.draws}</td>
              <td>{row.level}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination
        page={standings.page}
        total={standings.total}
        pathname={`/${locale}/leaderboard`}
        query=""
        t={t}
      />
    </section>
  );
}
