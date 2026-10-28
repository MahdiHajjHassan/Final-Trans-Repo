import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/shared/i18n/config";

/** /: send the visitor to Play in their saved language, falling back to English. */
export default async function Home() {
  const value = (await cookies()).get("__Host-taskboard_locale")?.value;
  redirect(`/${isLocale(value) ? value : "en"}/play`);
}
