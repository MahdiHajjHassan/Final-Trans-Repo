"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
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
export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}>
      <div className="dialog-body">
        <h2 id={titleId}>{title}</h2>
        {children}
        <Button variant="secondary" type="button" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </dialog>
  );
}
export function DataTable({
  caption,
  headings,
  children,
}: {
  caption: string;
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  total,
  pageSize = 25,
  pathname,
  query,
  t,
}: {
  page: number;
  total: number;
  pageSize?: number;
  pathname: string;
  query: string;
  t: Dictionary;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(value: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return `${pathname}?${params}`;
  }
  return (
    <nav className="pagination" aria-label={t.pagination}>
      {page > 1 ? (
        <Link className="button button-secondary" href={href(page - 1)}>
          {t.previous}
        </Link>
      ) : (
        <span />
      )}
      <span>
        {t.page} {page} {t.of} {pages}
      </span>
      {page < pages ? (
        <Link className="button button-secondary" href={href(page + 1)}>
          {t.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
export function Tabs({
  label,
  options,
  value,
  onChange,
  children,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label={label}>
        {options.map((option, index) => (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            role="tab"
            type="button"
            aria-controls={`${id}-panel`}
            aria-selected={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const forward = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
              const backward = document.documentElement.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
              const next =
                event.key === forward
                  ? (index + 1) % options.length
                  : event.key === backward
                    ? (index + options.length - 1) % options.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                onChange(options[next].value);
                document.getElementById(`${id}-${options[next].value}`)?.focus();
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${value}`} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
