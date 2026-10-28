"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, SelectField, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import type { AccountDTO } from "@/shared/auth";
import { displayNameSchema } from "@/shared/auth-validation";
import { request, useMutation } from "../../../lib/api";
import { formText, validateFields } from "../../../lib/validation";

/**
 * Edit one account or ask to delete it. The server decides whether the role change/deletion
 * is allowed.
 */
export function UserActions({ locale, user }: { locale: Locale; user: AccountDTO }) {
  const t = dictionaries[locale];
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mutation = useMutation();
  const router = useRouter();
  return (
    <div className="stack user-edit">
      {editing ? (
        <form
          method="post"
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void mutation.run(async () => {
              const input = {
                displayName: formText(form, "displayName").trim(),
                role: formText(form, "role"),
              };
              validateFields(input, { displayName: displayNameSchema });
              await request(`/api/admin/users/${user.id}`, "PUT", input);
              setEditing(false);
              router.refresh();
            });
          }}
        >
          <TextField
            name="displayName"
            label={t.displayName}
            required
            maxLength={60}
            defaultValue={user.displayName}
            error={mutation.error?.fields?.displayName ? t.invalidField : undefined}
          />
          <SelectField name="role" label={t.role} defaultValue={user.role}>
            <option value="MEMBER">{t.MEMBER}</option>
            <option value="ADMIN">{t.ADMIN}</option>
          </SelectField>
          <div className="actions">
            <Button disabled={mutation.pending}>{mutation.pending ? t.pending : t.save}</Button>
            <Button
              variant="secondary"
              type="button"
              disabled={mutation.pending}
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="actions">
          <Button
            variant="secondary"
            disabled={mutation.pending}
            onClick={() => {
              mutation.clear();
              setEditing(true);
            }}
          >
            {t.edit}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              mutation.clear();
              setDeleting(true);
            }}
          >
            {t.delete}
          </Button>
        </div>
      )}
      {!deleting && (
        <Feedback
          error={mutation.error}
          success={mutation.success && t.saved}
          t={t}
          locale={locale}
          onRefresh={() => {
            mutation.clear();
            setEditing(false);
          }}
        />
      )}
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={t.deleteUser}
        closeLabel={t.cancel}
      >
        <p>{t.deleteUserHelp}</p>
        <p>
          <bdi>{user.displayName}</bdi> · <bdi dir="ltr">{user.email}</bdi>
        </p>
        <Feedback
          error={mutation.error}
          t={t}
          locale={locale}
          onRefresh={() => {
            mutation.clear();
            setDeleting(false);
          }}
        />
        <Button
          variant="danger"
          disabled={mutation.pending}
          onClick={() =>
            void mutation.run(async () => {
              // This handler runs from the confirmation dialog, not the first Delete button.
              await request(`/api/admin/users/${user.id}`, "DELETE", {});
              setDeleting(false);
              router.refresh();
            })
          }
        >
          {mutation.pending ? t.pending : t.confirmDelete}
        </Button>
      </Dialog>
    </div>
  );
}
