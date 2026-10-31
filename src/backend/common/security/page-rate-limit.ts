import { isLocale, type Locale } from "@/shared/i18n/config";
import { clientKey } from "./origin";
import type { createRateLimiter } from "./rate-limit";

const assets = new Set([
  "/favicon.ico",
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/default-avatar.svg",
]);

// Page budgets exclude assets and API traffic, which has its own action limits.
export function shouldLimitPageRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const path = new URL(request.url).pathname;
  return (
    !assets.has(path) &&
    !["/api", "/_next", "/fonts"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

const messages: Record<Locale, (seconds: number) => string> = {
  en: (seconds) => `Too many requests. Wait ${seconds} seconds, then refresh this page.\n`,
  fr: (seconds) => `Trop de requêtes. Patientez ${seconds} secondes, puis actualisez cette page.\n`,
  ar: (seconds) => `طلبات كثيرة جداً. انتظر ${seconds} ثانية، ثم أعد تحميل الصفحة.\n`,
};

// A small, uncached response avoids rendering another page while a client is throttled.
function tooManyRequests(request: Request, seconds: number): Response {
  const candidate = new URL(request.url).pathname.split("/")[1];
  const locale = isLocale(candidate) ? candidate : "en";
  return new Response(request.method === "HEAD" ? null : messages[locale](seconds), {
    status: 429,
    headers: {
      "Retry-After": String(seconds),
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Language": locale,
    },
  });
}

// Atomic SQLite quotas are shared across requests, routes and server instances.
export function createPageRateLimit(consume: ReturnType<typeof createRateLimiter>) {
  return async function limitPage(request: Request): Promise<Response | null> {
    if (!shouldLimitPageRequest(request)) return null;
    const key = clientKey(request);
    const aggregate = await consume("page-request", key, 120, 10);
    if (!aggregate.allowed) return tooManyRequests(request, aggregate.retryAfterSeconds);

    // Prefetch/RSC has more room, but even a forged RSC header cannot bypass the total budget.
    // Caddy overwrites this marker before Next removes the original RSC header.
    if (request.headers.get("X-Taskboard-Page-RSC") !== "1") {
      const document = await consume("page-document", key, 30, 10);
      if (!document.allowed) return tooManyRequests(request, document.retryAfterSeconds);
    }
    return null;
  };
}
