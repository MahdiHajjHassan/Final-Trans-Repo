"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, CheckboxField, TextField } from "@/components/ui";
import { Feedback } from "@/components/feedback";
import { dictionaries } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { AccountDTO } from "@/shared/auth";
import {
  displayNameSchema,
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "@/shared/auth-validation";
import { RequestError, request, useMutation } from "./api";
import { formText, validateFields } from "./validation";
export function AuthForm({
  locale,
  mode,
  notice,
}: {
  locale: Locale;
  mode: "login" | "register";
  notice?: "registered" | "passwordChanged";
}) {
  const t = dictionaries[locale];
  const mutation = useMutation();
  const router = useRouter();
  const registration = mode === "register";
  const invalid = (field: string) => (mutation.error?.fields?.[field] ? t.invalidField : undefined);
  return (
    <form
      method="post"
      className="form stack"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        void mutation.run(async () => {
          const input = {
            email: formText(form, "email").trim().toLowerCase(),
            password: formText(form, "password"),
            ...(registration ? { displayName: formText(form, "displayName").trim() } : {}),
          };
          validateFields(input, {
            email: emailSchema,
            password: registration ? passwordSchema : loginPasswordSchema,
            ...(registration ? { displayName: displayNameSchema } : {}),
          });
          try {
            await request(`/api/auth/${mode}`, "POST", input);
          } catch (error) {
            if (!registration && error instanceof RequestError && error.code === "UNAUTHENTICATED")
              throw new RequestError("INVALID_CREDENTIALS");
            throw error;
          }
          router.push(registration ? `/${locale}/login?notice=registered` : `/${locale}/play`);
          router.refresh();
        });
      }}
    >
      {notice && <Alert tone="success">{t[notice]}</Alert>}
      {registration && (
        <>
          <Alert>{t.publicWarning}</Alert>
          <TextField
            name="displayName"
            label={t.displayName}
            required
            maxLength={60}
            autoComplete="nickname"
            error={invalid("displayName")}
          />
        </>
      )}
      <TextField
        name="email"
        label={t.email}
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        dir="ltr"
        error={invalid("email")}
      />
      <TextField
        name="password"
        label={t.password}
        type="password"
        required
        minLength={registration ? 12 : undefined}
        maxLength={128}
        autoComplete={registration ? "new-password" : "current-password"}
        hint={registration ? t.passwordHelp : undefined}
        error={invalid("password")}
      />
      {registration && (
        <>
          <CheckboxField name="terms" required label={t.acceptTerms} />
          <div className="actions">
            <Link
              href={`/${locale}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              title={t.opensNewTab}
            >
              {t.terms}
              <span className="sr-only"> ({t.opensNewTab})</span>
            </Link>
            <Link
              href={`/${locale}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              title={t.opensNewTab}
            >
              {t.privacy}
              <span className="sr-only"> ({t.opensNewTab})</span>
            </Link>
          </div>
        </>
      )}
      <Feedback error={mutation.error} t={t} locale={locale} />
      <Button disabled={mutation.pending}>
        {mutation.pending ? t.pending : registration ? t.register : t.login}
      </Button>
      <Link href={`/${locale}/${registration ? "login" : "register"}`}>
        {registration ? t.login : t.register}
      </Link>
    </form>
  );
}
export function AccountForms({ locale, account }: { locale: Locale; account: AccountDTO }) {
  const t = dictionaries[locale];
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
