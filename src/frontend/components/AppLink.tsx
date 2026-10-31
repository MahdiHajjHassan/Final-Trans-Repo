"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Keep page capacity for navigation across accounts sharing the same client IP. */
export default function AppLink({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={prefetch} />;
}
