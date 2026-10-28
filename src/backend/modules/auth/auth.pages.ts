import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServices } from "../../services";
import { sessionCookieName } from "./session.guard";
import type { Locale } from "@/shared/i18n/config";
// Share one session lookup across the page and layout for this render.
export const getPageActor = cache(async () => {
  const token = (await cookies()).get(sessionCookieName)?.value ?? null;
  return (await getServices()).auth.resolveSession(token);
});
export async function requirePageActor(locale: Locale) {
  const actor = await getPageActor();
  if (!actor) redirect(`/${locale}/login`);
  return actor;
}
