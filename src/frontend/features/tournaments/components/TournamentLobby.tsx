"use client";
import { useRouter } from "next/navigation";
import type { Locale } from "@/shared/i18n/config";
import type { TournamentDTO } from "@/shared/tournaments";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { Button, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { request, useMutation } from "@/frontend/lib/api";

// Registration needs four real accounts; creating a lobby also registers its host.
export function TournamentLobby({ locale }: { locale: Locale }) {
  const t = dictionaries[locale],
    create = useMutation(),
    join = useMutation(),
    router = useRouter();
  function open(row: TournamentDTO) {
    router.push(`/${locale}/tournaments/${row.id}`);
    router.refresh();
  }
  return (
    <div className="account-grid section">
      <section>
        <h2>{t.createTournament}</h2>
        <p>{t.tournamentRules}</p>
        <Feedback error={create.error} t={t} locale={locale} />
        <Button
          disabled={create.pending}
          onClick={() =>
            void create.run(async () =>
              open(await request<TournamentDTO>("/api/tournaments", "POST", {})),
            )
          }
        >
          {t.createTournament}
        </Button>
      </section>
      <section>
        <h2>{t.joinTournament}</h2>
        <form
          className="stack"
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            const code = String(new FormData(event.currentTarget).get("code") ?? "");
            void join.run(async () =>
              open(await request<TournamentDTO>("/api/tournaments/join", "POST", { code })),
            );
          }}
        >
          <TextField
            name="code"
            label={t.tournamentCode}
            required
            minLength={8}
            maxLength={8}
            autoComplete="off"
            dir="ltr"
            pattern="[A-HJ-NP-Za-hj-np-z2-9]{8}"
          />
          <Feedback error={join.error} t={t} locale={locale} />
          <Button disabled={join.pending}>{t.joinTournament}</Button>
        </form>
      </section>
    </div>
  );
}
