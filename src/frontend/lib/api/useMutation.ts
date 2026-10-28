"use client";

import { useState } from "react";
import { RequestError } from "@/frontend/lib/api/http";
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [success, setSuccess] = useState(false);
  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      await action();
      setSuccess(true);
    } catch (error) {
      const failure = error instanceof RequestError ? error : new RequestError("NETWORK");
      setError(failure);
      if (
        ["UNAUTHENTICATED", "FORBIDDEN"].includes(failure.code) &&
        typeof window !== "undefined"
      ) {
        const [, candidate, section] = window.location.pathname.split("/");
        const locale = ["en", "fr", "ar"].includes(candidate) ? candidate : "en";
        if (!["login", "register"].includes(section)) {
          // Reload the page so cached private content is cleared too.
          window.location.replace(
            `/${locale}/${failure.code === "UNAUTHENTICATED" ? "login" : "play"}`,
          );
        }
      }
    } finally {
      setPending(false);
    }
  }
  return {
    pending,
    error,
    success,
    run,
    clear: () => {
      setError(null);
      setSuccess(false);
    },
  };
}
