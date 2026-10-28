import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/shared/i18n/config";

// Pass the URL language to the root layout. This header is set here rather than trusted from
// the browser.
export function proxy(request: NextRequest) {
  const candidate = request.nextUrl.pathname.split("/")[1];
  const headers = new Headers(request.headers);
  headers.set("x-taskboard-locale", isLocale(candidate) ? candidate : "en");
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"] };
