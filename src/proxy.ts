import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
export function proxy(request: NextRequest) {
  const candidate = request.nextUrl.pathname.split("/")[1];
  const headers = new Headers(request.headers);
  headers.set("x-taskboard-locale", isLocale(candidate) ? candidate : "en");
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"] };
