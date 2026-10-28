"use client";

import { type ReactNode } from "react";

/** Status feedback; errors use the alert role so assistive technology announces them promptly. */
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
