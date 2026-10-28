import { NextResponse } from "next/server";
import { isLocale, readTheme } from "@/shared/i18n/config";
import { readJson, requireSameOrigin } from "@/backend/common/security/origin";
import { loadConfig } from "@/backend/config/env";
import { handleApi } from "@/backend/common/http";
import { DomainError } from "@/backend/common/errors";

// POST /api/preferences: validate the chosen language/theme and save the preference cookies.
export function POST(request: Request) {
  return handleApi(async () => {
    requireSameOrigin(request, loadConfig(process.env).appOrigin);
    const input = await readJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new DomainError("VALIDATION");
    const data = input as Record<string, unknown>;
    if (
      !Object.keys(data).length ||
      Object.keys(data).some((key) => !["locale", "theme"].includes(key)) ||
      (data.locale !== undefined && !isLocale(data.locale)) ||
      (data.theme !== undefined && data.theme !== "light" && data.theme !== "dark")
    )
      throw new DomainError("VALIDATION");
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
    const options = {
      secure: true,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    };
    if (isLocale(data.locale))
      response.cookies.set("__Host-taskboard_locale", data.locale, options);
    if (data.theme !== undefined)
      response.cookies.set("__Host-taskboard_theme", readTheme(data.theme), options);
    return response;
  });
}
