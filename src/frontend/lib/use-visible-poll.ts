"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { decodeResponse, RequestError } from "./api";

// Poll only visible documents; abort superseded requests so an old answer cannot win a race.
export function useVisiblePoll<T>(url: string, initial: T, interval: number) {
  const [data, setData] = useState(initial),
    [error, setError] = useState<RequestError | null>(null);
  const current = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (force = true) => {
      if (!force && current.current) return;
      current.current?.abort();
      const controller = new AbortController();
      current.current = controller;
      try {
        const result = await fetch(url, {
          credentials: "same-origin",
          signal: controller.signal,
          cache: "no-store",
        });
        const value = await decodeResponse<T>(result);
        if (!controller.signal.aborted) {
          setData(value);
          setError(null);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        const failure = cause instanceof RequestError ? cause : new RequestError("NETWORK");
        setError(failure);
        if (["UNAUTHENTICATED", "FORBIDDEN"].includes(failure.code)) {
          const locale = window.location.pathname.split("/")[1];
          window.location.replace(`/${["en", "fr", "ar"].includes(locale) ? locale : "en"}/login`);
        }
      } finally {
        if (current.current === controller) current.current = null;
      }
    },
    [url],
  );
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    function visibility() {
      if (timer) clearInterval(timer);
      current.current?.abort();
      if (!document.hidden) {
        void refresh();
        timer = setInterval(() => void refresh(false), interval);
      }
    }
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      if (timer) clearInterval(timer);
      current.current?.abort();
    };
  }, [refresh, interval]);
  return { data, error, refresh };
}
