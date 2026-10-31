"use client";

import Link from "@/frontend/components/AppLink";
import type { Dictionary } from "@/shared/i18n/dictionaries";

/** Previous/next links for a server-rendered list. Other search filters stay in the URL. */
export function Pagination({
  page,
  total,
  pageSize = 25,
  pathname,
  query,
  t,
}: {
  page: number;
  total: number;
  pageSize?: number;
  pathname: string;
  query: string;
  t: Dictionary;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(value: number) {
    const params = new URLSearchParams(query);
    params.set("page", String(value));
    return `${pathname}?${params}`;
  }
  return (
    <nav className="pagination" aria-label={t.pagination}>
      {page > 1 ? (
        <Link className="button button-secondary" href={href(page - 1)}>
          {t.previous}
        </Link>
      ) : (
        <span />
      )}
      <span>
        {t.page} {page} {t.of} {pages}
      </span>
      {page < pages ? (
        <Link className="button button-secondary" href={href(page + 1)}>
          {t.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
