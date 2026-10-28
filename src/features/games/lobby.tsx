"use client";
import { useRouter } from "next/navigation";
import { Button,TextField } from "@/components/ui";
import { Feedback } from "@/components/feedback";
import { dictionaries } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { GameMode,GameView } from "@/shared/games";
import { request,useMutation } from "../api";
export function GameLobby({locale}:{locale:Locale}) {
  const t=dictionaries[locale],router=useRouter(),mutation=useMutation();
  async function create(mode:GameMode) {
    const result=await request<GameView>("/api/games","POST",{mode});
    router.push("/"+locale+"/games/"+result.game.id);router.refresh();
  }
  return <><div className="play-options">
    <section className="play-option"><h2>{t.computer}</h2><p>{t.computerHelp}</p><Button disabled={mutation.pending} onClick={()=>void mutation.run(()=>create("AI"))}>{mutation.pending?t.pending:t.playComputer}</Button></section>
    <section className="play-option"><h2>{t.friend}</h2><p>{t.friendHelp}</p><Button variant="secondary" disabled={mutation.pending} onClick={()=>void mutation.run(()=>create("HUMAN"))}>{t.createFriend}</Button>
      <form method="post" className="join-form" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void mutation.run(async()=>{
        const result=await request<GameView>("/api/games/join","POST",{code:String(data.get("code"))});
        router.push("/"+locale+"/games/"+result.game.id);router.refresh();
      });}}><TextField label={t.roomCode} hint={t.joinHint} name="code" autoCapitalize="characters" autoComplete="off" dir="ltr" required minLength={8} maxLength={8} /><Button variant="secondary" disabled={mutation.pending}>{t.joinGame}</Button></form>
    </section>
  </div><Feedback error={mutation.error} t={t} locale={locale} /></>;
}
