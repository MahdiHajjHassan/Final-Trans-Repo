"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button } from "./ui";
import type { Dictionary } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import type { RequestError } from "@/frontend/lib/api";

/**
 * Shows translated form feedback. Conflicts offer a refresh so the next action uses current
 * data.
 */
export function Feedback({
  error,
  success,
  t,
  locale,
  onRefresh,
}: {
  error: RequestError | null;
  success?: string | false;
  t: Dictionary;
  locale?: Locale;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  if (error)
    return (
      <Alert tone="error">
        <p>{t[error.code as keyof Dictionary] ?? t.INTERNAL}</p>
        {error.fields && (
          <ul>
            {Object.keys(error.fields).map((field) => {
              // Nested errors can name a row as well as a field, for example "items.0.name".
              const parts = field.split(".");
              const row = parts.find((part) => /^\d+$/.test(part));
              const name = parts.at(-1)!;
              return (
                <li key={field}>
                  {row !== undefined && (
                    <>
                      {t.row} {Number(row) + 1}
                      {": "}
                    </>
                  )}
                  {t[name as keyof Dictionary] ?? t.field}: {t.invalidField}
                </li>
              );
            })}
          </ul>
        )}
        {["CONFLICT", "NOT_FOUND"].includes(error.code) && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onRefresh?.();
              router.refresh();
            }}
          >
            {t.refresh}
          </Button>
        )}
        {error.code === "UNAUTHENTICATED" && locale && (
          <Link href={`/${locale}/login`}>{t.login}</Link>
        )}
      </Alert>
    );
  return success ? <Alert tone="success">{success}</Alert> : null;
}
