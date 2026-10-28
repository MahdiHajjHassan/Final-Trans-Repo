"use client";

import { type ReactNode } from "react";

/** A small label for a role or game state, using the shared colour tokens. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
