"use client";

import { type ButtonHTMLAttributes } from "react";

/** The shared button styles. Normal button attributes and event handlers pass through. */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
