import { pageLocale } from "@/i18n/server";
import { requirePageActor } from "@/server/auth/page";
import { getServices } from "@/server/services";
import { DomainError } from "@/server/errors";
import { Alert, Badge, Button, DataTable, EmptyState, Pagination, TextField } from "@/components/ui";
import { UserActions,CreateUser } from "@/features/users";
export const metadata = { robots: { index: false, follow: false } };
export default async function Users({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await pageLocale(params); const actor = await requirePageActor(locale);
  if (actor.role !== "ADMIN") return <Alert tone="error">{t.FORBIDDEN}</Alert>;
  const raw = await searchParams; const query = { q: typeof raw.q === "string" ? raw.q : "", page: typeof raw.page === "string" ? Number(raw.page) : 1 }; const services = await getServices(); let invalid = false; let result;
  try { result = await services.users.listUsers(actor, query); } catch (error) { if (!(error instanceof DomainError) || error.code !== "VALIDATION") throw error; invalid = true; result = await services.users.listUsers(actor); }
  const search = new URLSearchParams({ q: invalid ? "" : query.q });
  return <><div className="page-heading"><div><h1>{t.users}</h1><p>{t.adminDescription}</p></div></div>{invalid && <Alert tone="error">{t.VALIDATION}</Alert>}<form className="form actions" method="get"><TextField name="q" type="search" label={t.searchUsers} maxLength={100} defaultValue={invalid ? "" : query.q} /><Button>{t.apply}</Button></form><CreateUser locale={locale}/><div className="section">{result.items.length ? <DataTable caption={t.users} headings={[t.displayName, t.email, t.role, t.actions]}>{result.items.map((user) => <tr key={user.id}><th scope="row"><bdi>{user.displayName}</bdi></th><td><bdi dir="ltr">{user.email}</bdi></td><td><Badge>{t[user.role]}</Badge></td><td><UserActions key={`${user.id}-${user.role}-${user.displayName}`} locale={locale} user={user} /></td></tr>)}</DataTable> : <EmptyState title={t.noUsers} />}</div><Pagination page={result.page} total={result.total} pathname={`/${locale}/admin/users`} query={search.toString()} t={t} /></>;
}
