"use client";

import { useRouter } from "next/navigation";
import { Button, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import type { AccountDTO } from "@/shared/auth";
import { displayNameSchema, loginPasswordSchema, passwordSchema } from "@/shared/auth-validation";
import { request, useMutation } from "../../../lib/api";
import { formText, validateFields } from "../../../lib/validation";

/**
 * Two independent forms: change the public display name, or change the password and sign in
 * again.
 */
export function AccountForms({ locale, account }: { locale: Locale; account: AccountDTO }) {
  const t = dictionaries[locale];

  // Each form keeps its own pending/error state, so one form doesn't overwrite the other.
  const profile = useMutation();
  const password = useMutation();
  const router = useRouter();
  return (
    <div className="account-grid">
      <section>
        <h2>{t.profile}</h2>
        <form
          method="post"
          className="stack section"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void profile.run(async () => {
              const input = { displayName: formText(form, "displayName").trim() };
              validateFields(input, { displayName: displayNameSchema });

              // Save the name, then reload the server-rendered account details.
              await request("/api/account", "PATCH", input);
              router.refresh();
            });
          }}
        >
          <TextField name="email" label={t.email} value={account.email} readOnly dir="ltr" />
          <TextField
            name="displayName"
            label={t.displayName}
            defaultValue={account.displayName}
            required
            maxLength={60}
            autoComplete="nickname"
            error={profile.error?.fields?.displayName ? t.invalidField : undefined}
          />
          <Feedback
            error={profile.error}
            success={profile.success && t.saved}
            t={t}
            locale={locale}
          />
          <Button disabled={profile.pending}>{profile.pending ? t.pending : t.save}</Button>
        </form>
      </section>
      <section>
        <h2>{t.security}</h2>
        <form
          method="post"
          className="stack section"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void password.run(async () => {
              const input = {
                currentPassword: formText(form, "currentPassword"),
                newPassword: formText(form, "newPassword"),
              };
              validateFields(input, {
                currentPassword: loginPasswordSchema,
                newPassword: passwordSchema,
              });
              await request("/api/account/password", "PUT", input);

              // The password change revoked the sessions, including the one in this browser.
              router.push(`/${locale}/login?notice=passwordChanged`);
              router.refresh();
            });
          }}
        >
          <TextField
            name="currentPassword"
            type="password"
            label={t.currentPassword}
            autoComplete="current-password"
            maxLength={128}
            required
            error={password.error?.fields?.currentPassword ? t.invalidField : undefined}
          />
          <TextField
            name="newPassword"
            type="password"
            label={t.newPassword}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            hint={t.passwordHelp}
            error={password.error?.fields?.newPassword ? t.invalidField : undefined}
          />
          <Feedback error={password.error} t={t} locale={locale} />
          <Button disabled={password.pending}>
            {password.pending ? t.pending : t.changePassword}
          </Button>
        </form>
      </section>
    </div>
  );
}
