"use client";

import Link from "@/frontend/components/AppLink";
import { usePathname } from "next/navigation";
import { dictionaries } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/config";
import { Logout } from "./preferences";

/** Keep the current section visible, including when a player opens a match. */
export function Navigation({ locale, role }: { locale: Locale; role?: "ADMIN" | "MEMBER" }) {
  const path = usePathname();
  const t = dictionaries[locale];
  const items = role
    ? [
        { route: "play", label: t.board },
        { route: "account", label: t.account },
        { route: "friends", label: t.friends },
        { route: "tournaments", label: t.tournaments },
        { route: "history", label: t.history },
        ...(role === "ADMIN" ? [{ route: "admin/users", label: t.users }] : []),
      ]
    : [
        { route: "play", label: t.board },
        { route: "login", label: t.login },
        { route: "register", label: t.register },
      ];
  return (
    <nav aria-label={t.mainNavigation} className="main-nav">
      {items.map(({ route, label }) => {
        const href = `/${locale}/${route}`;
        const active =
          path === href ||
          (route === "play" && path.startsWith(`/${locale}/games/`)) ||
          (route === "history" && path === `/${locale}/leaderboard`) ||
          (route === "tournaments" && path.startsWith(`/${locale}/tournaments/`)) ||
          (route === "friends" && path.startsWith(`/${locale}/profiles/`));
        return (
          <Link key={route} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
      {role && <Logout locale={locale} />}
    </nav>
  );
}
