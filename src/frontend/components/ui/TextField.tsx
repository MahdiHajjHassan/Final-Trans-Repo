"use client";

import { useId, type InputHTMLAttributes } from "react";
import { FormField } from "@/frontend/components/ui/FormField";

/** A labelled input with its own stable ID and links to any hint or field error. */
export function TextField({
  label,
  hint,
  error,
  id: suppliedId,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FormField label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={
          [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
        }
        {...props}
      />
    </FormField>
  );
}
