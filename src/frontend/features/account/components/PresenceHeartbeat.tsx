"use client";
import { useEffect } from "react";
// Visible authenticated tabs keep only their own session's approximate presence fresh.
export function PresenceHeartbeat() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined,
      active: AbortController | null = null;
    async function beat() {
      if (active) return;
      const controller = new AbortController();
      active = controller;
      try {
        const response = await fetch("/api/account/presence", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        if (response.status === 401) {
          const locale = window.location.pathname.split("/")[1];
          window.location.replace(`/${["en", "fr", "ar"].includes(locale) ? locale : "en"}/login`);
        }
      } catch {
      } finally {
        if (active === controller) active = null;
      }
    }
    function visibility() {
      if (timer) clearInterval(timer);
      active?.abort();
      active = null;
      if (!document.hidden) {
        void beat();
        timer = setInterval(() => void beat(), 15000);
      }
    }
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      active?.abort();
    };
  }, []);
  return null;
}
