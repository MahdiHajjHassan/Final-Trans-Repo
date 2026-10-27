"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, SelectField, TextField } from "@/components/ui";
import { Feedback } from "@/components/feedback";
import { dictionaries } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { AccountDTO } from "@/shared/auth";
import { request, useMutation } from "./api";
export function CreateUser({locale}:{locale:Locale}){
  const t=dictionaries[locale],router=useRouter(),mutation=useMutation(),[open,setOpen]=useState(false);
  return <section className="section">{open?<form className="form stack" onSubmit={event=>{
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    void mutation.run(async()=>{await request("/api/admin/users","POST",Object.fromEntries(data));form.reset();setOpen(false);router.refresh();});
  }}><h2>{t.createUser}</h2><TextField name="displayName" label={t.displayName} required maxLength={60}/>
    <TextField name="email" type="email" label={t.email} autoComplete="off" required maxLength={254} dir="ltr"/>
    <TextField name="password" type="password" label={t.password} autoComplete="new-password" required minLength={12} maxLength={128}/>
    <SelectField name="role" label={t.role} defaultValue="MEMBER"><option value="MEMBER">{t.MEMBER}</option><option value="ADMIN">{t.ADMIN}</option></SelectField>
    <Feedback error={mutation.error} t={t} locale={locale}/><div className="actions"><Button disabled={mutation.pending}>{mutation.pending?t.pending:t.createUser}</Button><Button type="button" variant="secondary" disabled={mutation.pending} onClick={()=>setOpen(false)}>{t.cancel}</Button></div>
  </form>:<><Button type="button" onClick={()=>{mutation.clear();setOpen(true);}}>{t.createUser}</Button><Feedback error={mutation.error} success={mutation.success&&t.saved} t={t} locale={locale}/></>}</section>;
}
export function UserActions({ locale, user }: { locale: Locale; user: AccountDTO }) {
  const t = dictionaries[locale]; const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const mutation = useMutation(); const router = useRouter();
  return <div className="stack user-edit">{editing ? <form className="stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutation.run(async () => { await request(`/api/admin/users/${user.id}`, "PUT", { displayName: String(data.get("displayName")).trim(), role: data.get("role") }); setEditing(false); router.refresh(); }); }}>
    <TextField name="displayName" label={t.displayName} required maxLength={60} defaultValue={user.displayName} /><SelectField name="role" label={t.role} defaultValue={user.role}><option value="MEMBER">{t.MEMBER}</option><option value="ADMIN">{t.ADMIN}</option></SelectField><div className="actions"><Button disabled={mutation.pending}>{mutation.pending ? t.pending : t.save}</Button><Button variant="secondary" type="button" disabled={mutation.pending} onClick={() => setEditing(false)}>{t.cancel}</Button></div>
  </form> : <div className="actions"><Button variant="secondary" disabled={mutation.pending} onClick={() => { mutation.clear(); setEditing(true); }}>{t.edit}</Button><Button variant="secondary" onClick={() => { mutation.clear(); setDeleting(true); }}>{t.delete}</Button></div>}
    {!deleting && <Feedback error={mutation.error} success={mutation.success && t.saved} t={t} locale={locale} onRefresh={() => { mutation.clear(); setEditing(false); }} />}
    <Dialog open={deleting} onClose={() => setDeleting(false)} title={t.deleteUser} closeLabel={t.cancel}><p>{t.deleteUserHelp}</p><p><bdi>{user.displayName}</bdi> · <bdi dir="ltr">{user.email}</bdi></p><Feedback error={mutation.error} t={t} locale={locale} onRefresh={() => { mutation.clear(); setDeleting(false); }} /><Button variant="danger" disabled={mutation.pending} onClick={() => void mutation.run(async () => { await request(`/api/admin/users/${user.id}`, "DELETE", {}); setDeleting(false); router.refresh(); })}>{mutation.pending ? t.pending : t.confirmDelete}</Button></Dialog>
  </div>;
}
