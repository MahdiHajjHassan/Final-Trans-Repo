"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { PublicProfile } from "@/shared/profiles";
import type { Locale } from "@/shared/i18n/config";
import { dictionaries } from "@/shared/i18n/dictionaries";
import { Alert, Button, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { useMutation, request, decodeResponse, RequestError } from "@/frontend/lib/api";

// Upload pixels only; filenames and private form values never enter navigation or storage.
export function AvatarForm({ profile, locale }: { profile: PublicProfile; locale: Locale }) {
  const t = dictionaries[locale],
    mutation = useMutation(),
    router = useRouter();
  const avatarIssue = mutation.error?.fields?.avatar?.[0],
    avatarMessage =
      avatarIssue === "unsupported_format"
        ? t.avatarInvalidFormat
        : avatarIssue === "image_too_large"
          ? t.avatarTooLarge
          : avatarIssue
            ? t.avatarInvalidImage
            : undefined;
  return (
    <section className="section avatar-editor">
      <div>
        <Image
          unoptimized
          src={profile.avatarUrl}
          alt={t.yourAvatar}
          width={96}
          height={96}
          className="member-avatar"
        />
        <h2>{t.avatar}</h2>
      </div>
      <form
        method="post"
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          void mutation.run(async () => {
            const file = new FormData(form).get("avatar");
            if (!(file instanceof File) || !file.size)
              throw new RequestError("VALIDATION", { avatar: ["invalid_image"] });
            if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
              throw new RequestError("VALIDATION", { avatar: ["unsupported_format"] });
            if (file.size > 2097152)
              throw new RequestError("VALIDATION", { avatar: ["image_too_large"] });
            const response = await fetch("/api/account/avatar", {
              method: "PUT",
              credentials: "same-origin",
              headers: { "Content-Type": file.type },
              body: file,
            });
            await decodeResponse(response);
            form.reset();
            router.refresh();
          });
        }}
      >
        <TextField
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          label={t.avatarImage}
          error={avatarMessage}
          hint={t.avatarHelp}
        />
        {avatarMessage ? (
          <Alert tone="error">
            <p>{t.avatarUnchanged}</p>
          </Alert>
        ) : (
          <Feedback
            error={mutation.error}
            success={mutation.success && t.saved}
            t={t}
            locale={locale}
          />
        )}
        <div className="actions">
          <Button disabled={mutation.pending}>{t.uploadAvatar}</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.pending}
            onClick={() =>
              void mutation.run(async () => {
                await request("/api/account/avatar", "DELETE", {});
                router.refresh();
              })
            }
          >
            {t.removeAvatar}
          </Button>
        </div>
      </form>
    </section>
  );
}
