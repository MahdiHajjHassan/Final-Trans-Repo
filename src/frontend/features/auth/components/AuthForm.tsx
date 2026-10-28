"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, CheckboxField, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import {
  displayNameSchema,
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "@/shared/auth-validation";
import { RequestError, request, useMutation } from "../../../lib/api";
import { formText, validateFields } from "../../../lib/validation";

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
