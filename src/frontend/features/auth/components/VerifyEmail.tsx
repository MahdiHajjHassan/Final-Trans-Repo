"use client";

import Link from "@/frontend/components/AppLink";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField } from "@/frontend/components/ui";
import { Feedback } from "@/frontend/components/Feedback";
import { RequestError, request, useMutation } from "@/frontend/lib/api";
import { formText } from "@/frontend/lib/validation";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import type { VerificationMetadata } from "@/shared/auth";

/** Verify once in the requesting browser; later sign-ins continue to use the password. */
export function VerifyEmail({
  locale,
  initial,
}: {
  locale: Locale;
  initial: VerificationMetadata | null;
}) {
  const t = dictionaries[locale],
    router = useRouter(),
    mutation = useMutation();
  const [metadata, setMetadata] = useState(initial),
    [code, setCode] = useState("");
  const [now, setNow] = useState(initial ? Date.parse(initial.serverNow) : 0),
    [blockedUntil, setBlockedUntil] = useState(0);
  const busy = useRef(false);
  const serverClock = metadata?.serverNow;
  useEffect(() => {
    if (!serverClock) return;
    const base = Date.parse(serverClock),
      started = Date.now();
    const interval = window.setInterval(() => setNow(base + Date.now() - started), 1000);
    return () => window.clearInterval(interval);
  }, [serverClock]);

  // Serialize explicit actions. An uncertain submission is never automatically repeated.
  async function perform(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    try {
      await mutation.run(async () => {
        try {
          await action();
        } catch (error) {
          if (error instanceof RequestError && error.retryAfterSeconds)
            setBlockedUntil(now + error.retryAfterSeconds * 1000);
          throw error;
        }
      });
    } finally {
      busy.current = false;
    }
  }
  const links = (
    <div className="actions">
      {metadata?.adminCreation ? (
        <Link href={`/${locale}/admin/users`}>{t.users}</Link>
      ) : (
        <>
          <Link href={`/${locale}/register`}>{t.verificationRestart}</Link>
          <Link href={`/${locale}/login`}>{t.login}</Link>
        </>
      )}
    </div>
  );
  if (!metadata)
    return (
      <div className="stack">
        <Alert>{t.verificationMissing}</Alert>
        {links}
      </div>
    );
  const seconds = Math.max(
    0,
    Math.ceil((Math.max(Date.parse(metadata.resendAt), blockedUntil) - now) / 1000),
  );
  const expired = now >= Date.parse(metadata.expiresAt);
  const codeError = mutation.error?.code === "INVALID_CODE" ? t.INVALID_CODE : undefined;
  return (
    <form
      method="post"
      className="form stack"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        void perform(async () => {
          const value = formText(form, "code");
          if (!/^\d{6}$/.test(value)) throw new RequestError("INVALID_CODE");
          await request("/api/auth/verification/confirm", "POST", { code: value });
          setCode("");
          router.replace(
            metadata.adminCreation
              ? `/${locale}/admin/users?notice=userCreated`
              : `/${locale}/login?notice=verified`,
          );
          router.refresh();
        });
      }}
    >
      <p className="verification-address">
        <bdi dir="ltr">{metadata.email}</bdi>
      </p>
      <Alert tone={metadata.status === "FAILED" ? "error" : "info"}>
        {metadata.status === "FAILED"
          ? t.EMAIL_UNAVAILABLE
          : metadata.status === "PENDING"
            ? t.verificationSending
            : t.verificationSent}
      </Alert>
      {expired && <Alert tone="error">{t.verificationExpired}</Alert>}
      <div aria-live="polite">
        <TextField
          name="code"
          label={t.verificationCode}
          className="verification-code"
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          required
          hint={t.verificationHint}
          error={codeError}
          disabled={mutation.pending || metadata.status !== "SENT"}
        />
      </div>
      <p>{t.verificationExpiry}</p>
      <Feedback error={codeError ? null : mutation.error} t={t} locale={locale} />
      <Button disabled={mutation.pending || metadata.status !== "SENT" || expired}>
        {mutation.pending ? t.pending : t.verifyEmail}
      </Button>
      <div className="actions">
        <Button
          type="button"
          variant="secondary"
          disabled={mutation.pending || seconds > 0}
          onClick={() =>
            void perform(async () => {
              const next = await request<VerificationMetadata>(
                "/api/auth/verification/resend",
                "POST",
                {},
              );
              setMetadata(next);
              setNow(Date.parse(next.serverNow));
              setCode("");
            })
          }
        >
          {t.resendCode}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={mutation.pending}
          onClick={() =>
            void perform(async () => {
              try {
                const next = await request<VerificationMetadata>("/api/auth/verification", "GET");
                setMetadata(next);
                setNow(Date.parse(next.serverNow));
              } catch (error) {
                if (error instanceof RequestError && error.code === "INVALID_CODE") {
                  setMetadata(null);
                  return;
                }
                throw error;
              }
            })
          }
        >
          {t.refresh}
        </Button>
      </div>
      {seconds > 0 && (
        <p className="muted" aria-live="off">
          {t.resendIn.replace("{seconds}", new Intl.NumberFormat(locale).format(seconds))}
        </p>
      )}
      <p>{metadata.adminCreation ? t.adminVerificationAddressHelp : t.verificationAddressHelp}</p>
      {links}
    </form>
  );
}
