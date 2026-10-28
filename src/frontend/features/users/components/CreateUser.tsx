"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, SelectField, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import { displayNameSchema, emailSchema, passwordSchema } from "@/shared/auth-validation";
import { request, useMutation } from "../../../lib/api";
import { formText, validateFields } from "../../../lib/validation";

export function CreateUser({ locale }: { locale: Locale }) {
  const t = dictionaries[locale],
    router = useRouter(),
    mutation = useMutation(),
    [open, setOpen] = useState(false);
  return (
    <section className="section">
      {open ? (
        <form
          method="post"
          className="form stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void mutation.run(async () => {
              const input = {
                displayName: formText(form, "displayName").trim(),
                email: formText(form, "email").trim().toLowerCase(),
                password: formText(form, "password"),
                role: formText(form, "role"),
              };
              validateFields(input, {
                displayName: displayNameSchema,
                email: emailSchema,
                password: passwordSchema,
              });
              await request("/api/admin/users", "POST", input);
              form.reset();
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <h2>{t.createUser}</h2>
          <TextField
            name="displayName"
            label={t.displayName}
            required
            maxLength={60}
            error={mutation.error?.fields?.displayName ? t.invalidField : undefined}
          />
          <TextField
            name="email"
            type="email"
            label={t.email}
            autoComplete="off"
            required
            maxLength={254}
            dir="ltr"
            error={mutation.error?.fields?.email ? t.invalidField : undefined}
          />
          <TextField
            name="password"
            type="password"
            label={t.password}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            error={mutation.error?.fields?.password ? t.invalidField : undefined}
          />
          <SelectField name="role" label={t.role} defaultValue="MEMBER">
            <option value="MEMBER">{t.MEMBER}</option>
            <option value="ADMIN">{t.ADMIN}</option>
          </SelectField>
          <Feedback error={mutation.error} t={t} locale={locale} />
          <div className="actions">
            <Button disabled={mutation.pending}>
              {mutation.pending ? t.pending : t.createUser}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={mutation.pending}
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <Button
            type="button"
            onClick={() => {
              mutation.clear();
              setOpen(true);
            }}
          >
            {t.createUser}
          </Button>
          <Feedback
            error={mutation.error}
            success={mutation.success && t.saved}
            t={t}
            locale={locale}
          />
        </>
      )}
    </section>
  );
}
