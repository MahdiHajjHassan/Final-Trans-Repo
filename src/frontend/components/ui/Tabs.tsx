"use client";

import { useId, type ReactNode } from "react";

/** One active tab and panel, with arrow/Home/End keys and reversed arrow directions in RTL. */
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
