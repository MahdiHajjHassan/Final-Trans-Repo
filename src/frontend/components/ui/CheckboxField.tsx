"use client";

import { useId, type InputHTMLAttributes } from "react";

export function CheckboxField({
  label,
  id: suppliedId,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
