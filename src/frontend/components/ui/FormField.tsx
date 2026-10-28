"use client";

import { type ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small id={`${htmlFor}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${htmlFor}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
