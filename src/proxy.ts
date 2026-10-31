import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/shared/i18n/config";
import { getDb } from "@/backend/database/db";
import { createRateLimiter } from "@/backend/common/security/rate-limit";
import {
  createPageRateLimit,
  shouldLimitPageRequest,
} from "@/backend/common/security/page-rate-limit";

let pageLimit: Promise<ReturnType<typeof createPageRateLimit>> | undefined;

// Reuse the limiter and its pruning schedule; a failed connection can be retried.
function getPageLimit() {
  pageLimit ??= getDb()
    .then((db) => createPageRateLimit(createRateLimiter(db)))
    .catch((error) => {
      pageLimit = undefined;
      throw error;
    });
  return pageLimit;
}

// Pass the URL language to the root layout. This header is set here rather than trusted from
// the browser.
export async function proxy(request: NextRequest) {
  if (shouldLimitPageRequest(request)) {
    const limited = await (await getPageLimit())(request);
    if (limited) return limited;
  }
  const candidate = request.nextUrl.pathname.split("/")[1];
  const headers = new Headers(request.headers);
  headers.set("x-taskboard-locale", isLocale(candidate) ? candidate : "en");
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|fonts(?:/|$)|(?:favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|default-avatar\\.svg)$).*)",
  ],
};
