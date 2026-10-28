"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { isLocale, localePath, type Locale } from "@/shared/i18n/config";
import { Button, SelectField } from "../components/ui";
import { Feedback } from "../components/Feedback";
import { request, useMutation } from "@/frontend/lib/api";

/** Save language/theme in cookies, then refresh so the server renders the same preference. */
export function Preferences({ locale, theme }: { locale: Locale; theme: "light" | "dark" }) {
  const t = dictionaries[locale];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const mutation = useMutation();
  return (
    <div className="preferences">
      <SelectField
        label={t.language}
        value={locale}
        disabled={mutation.pending}
        onChange={(event) => {
          const value = event.target.value;
          if (isLocale(value))
            void mutation.run(async () => {
              await request("/api/preferences", "POST", { locale: value });
              router.push(localePath(pathname, params.toString(), value));
              router.refresh();
            });
        }}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="fr" lang="fr">
          Français
        </option>
        <option value="ar" lang="ar">
          العربية
        </option>
      </SelectField>
      <Button
        variant="secondary"
        disabled={mutation.pending}
        onClick={() =>
          void mutation.run(async () => {
            await request("/api/preferences", "POST", {
              theme: theme === "light" ? "dark" : "light",
            });
            router.refresh();
          })
        }
      >
        {theme === "light" ? t.dark : t.light}
      </Button>
      <Feedback error={mutation.error} t={t} locale={locale} />
    </div>
  );
}

/** End this browser's session and refresh the public play page. */
export function Logout({ locale }: { locale: Locale }) {
  const mutation = useMutation();
  const router = useRouter();
  const t = dictionaries[locale];
  return (
    <div>
      <Button
        variant="secondary"
        disabled={mutation.pending}
        onClick={() =>
          void mutation.run(async () => {
            await request("/api/auth/logout", "POST", {});
            router.push(`/${locale}/play`);
            router.refresh();
          })
        }
      >
        {mutation.pending ? t.pending : t.logout}
      </Button>
      <Feedback error={mutation.error} t={t} />
    </div>
  );
}

/** Reload server-rendered data for the current page. */
export function Refresh({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button variant="secondary" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}
