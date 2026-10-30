import type { ReactNode } from "react";
import type { Dictionary } from "@/shared/i18n/dictionaries";
import { GameArtwork } from "@/frontend/components/GameArtwork";

/** Pair account entry with the same visual identity as the game lobby. */
export function AuthLayout({ children, t }: { children: ReactNode; t: Dictionary }) {
  return (
    <div className="auth-layout">
      <section className="auth-content">{children}</section>
      <aside className="auth-aside">
        <h2>{t.playDescription}</h2>
        <GameArtwork compact />
        <div className="auth-rules">
          <h3>{t.rulesHeading}</h3>
          <p>{t.rules}</p>
        </div>
      </aside>
    </div>
  );
}
