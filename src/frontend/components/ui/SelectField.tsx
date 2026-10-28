"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { FormField } from "@/frontend/components/ui/FormField";

/** A labelled select. Generate an ID when its caller has not supplied one. */
export function SelectField({
  label,
  id: suppliedId,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FormField label={label} htmlFor={id}>
      <select id={id} {...props}>
        {children}
      </select>
    </FormField>
  );
}
