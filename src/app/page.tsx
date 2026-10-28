import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
export default async function Home() {
  const value = (await cookies()).get("__Host-taskboard_locale")?.value;
  redirect(`/${isLocale(value) ? value : "en"}/play`);
}
