import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServices } from "../../services";
import { sessionCookieName } from "./session.guard";
import type { Locale } from "@/shared/i18n/config";

// Who is logged in for this page render? The layout and page share this one lookup.
export const getPageActor = cache(async () => {
  const token = (await cookies()).get(sessionCookieName)?.value ?? null;
  return (await getServices()).auth.resolveSession(token);
});

// For member pages: visitors go to the login page before private data is loaded.
export async function requirePageActor(locale: Locale) {
  const actor = await getPageActor();
  if (!actor) redirect(`/${locale}/login`);
  return actor;
}
