"use client";

import { useState } from "react";
import { RequestError } from "@/frontend/lib/api/http";

/** State for a form or button action: pending, success and the last failure. */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [success, setSuccess] = useState(false);

  // Start with clean feedback, run the action, then store its result for the component.
  async function run(action: () => Promise<void>) {
    // Moves are never retried here: a lost response may still have saved the move.
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
